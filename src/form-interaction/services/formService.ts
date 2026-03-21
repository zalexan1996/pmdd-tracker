import { Client, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextChannel, MessageFlags, StringSelectMenuInteraction, ButtonInteraction } from 'discord.js';
import cron from 'node-cron';
import { DatabaseService } from '../../domain/services/database-service.js';
import { Question } from '../../domain/models/question.js';
import { QUESTIONS, SEVERITY_OPTIONS, YES_NO_OPTIONS } from '../constants.js';

// In-memory storage for incomplete form responses
// Key format: "userId_formDate" -> Map of question number (1-based) to answer value
const pendingResponses = new Map<string, Map<number, string>>();

const TOTAL_QUESTIONS = QUESTIONS.length;

export class FormService {

  handleFormInteraction(
    interaction: StringSelectMenuInteraction | ButtonInteraction
  ): Promise<void> {
    const customId = interaction.customId;

    if (interaction.isStringSelectMenu() && customId.startsWith('symptom_')) {
      return this.handleSymptomSelection(interaction);
    }

    if (interaction.isButton() && customId.startsWith('submit_symptoms_')) {
      return this.handleSubmit(interaction);
    }

    return Promise.resolve();
  }

  async handleSymptomSelection(interaction: StringSelectMenuInteraction): Promise<void> {
    const customId = interaction.customId;
    const userId = interaction.user.id;

    const parts = customId.split('_');
    const questionNumber = parseInt(parts[1]);
    const formDate = parts[2];
    const selectedValue = interaction.values[0];

    const responseKey = `${userId}_${formDate}`;

    if (!pendingResponses.has(responseKey)) {
      pendingResponses.set(responseKey, new Map());
    }

    const userResponses = pendingResponses.get(responseKey)!;
    userResponses.set(questionNumber, selectedValue);

    console.log(`📝 User ${interaction.user.tag} answered Q${questionNumber}: ${selectedValue}`);
    await interaction.deferUpdate();
  }

  async handleSubmit(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const username = interaction.user.tag;

    const formDate = customId.replace('submit_symptoms_', '');
    const responseKey = `${userId}_${formDate}`;
    const userResponses = pendingResponses.get(responseKey);

    if (!userResponses || userResponses.size !== TOTAL_QUESTIONS) {
      const answeredCount = userResponses ? userResponses.size : 0;
      const missingQuestions: number[] = [];

      for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
        if (!userResponses || !userResponses.has(i)) {
          missingQuestions.push(i);
        }
      }

      await interaction.reply({
        content: `❌ Please answer all ${TOTAL_QUESTIONS} questions before submitting.\n` +
          `You've answered ${answeredCount}/${TOTAL_QUESTIONS} questions.\n` +
          `Missing questions: ${missingQuestions.join(', ')}`,
        ephemeral: true
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const db = new DatabaseService(interaction.client.discordSettings.DbPath);
      try {
        const questions = db.getQuestions();
        const responses: { questionId: number; answerId: number }[] = [];

        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
          const value = userResponses.get(i)!;
          const question = questions[i - 1];
          const answerId = db.getAnswerIdByQuestionAndValue(question.id, value);
          if (answerId === undefined) {
            throw new Error(`Invalid answer value "${value}" for question ${i}`);
          }
          responses.push({ questionId: question.id, answerId });
        }

        db.saveProvidedAnswers(userId, formDate, responses);
      } finally {
        db.close();
      }

      pendingResponses.delete(responseKey);

      await interaction.editReply({
        content: `✅ Thank you! Your symptom data for ${formDate} has been recorded.`
      });

      console.log(`✅ Saved complete symptom data for ${username} (${userId}) on ${formDate}`);
    } catch (error) {
      console.error('❌ Error saving symptom data:', error);

      await interaction.editReply({
        content: '❌ An error occurred while saving your responses. Please try again or contact an administrator.'
      });
    }
  }

  getPendingResponses(): Map<string, Map<number, string>> {
    return pendingResponses;
  }

  clearPendingResponses(userId: string, formDate: string): void {
    const responseKey = `${userId}_${formDate}`;
    pendingResponses.delete(responseKey);
  }

  private createFormMessage(formDate: string, questions: Question[]) {
    const header = `📋 **Daily PMDD Symptom Tracker - ${formDate}**\n\n` +
      `Please rate each symptom according to severity:\n` +
      `\t**1** - Not at all\n\t**2** - Minimal\n\t**3** - Mild\n\t**4** - Moderate\n\t**5** - Severe\n\t**6** - Extreme\n\n`;

    const selectMenus: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

    questions.forEach((question, index) => {
      const options = question.responseType === 'yes_no' ? YES_NO_OPTIONS : SEVERITY_OPTIONS;
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`symptom_${index + 1}_${formDate}`)
        .setPlaceholder(`Q${index + 1}: Provide a response`)
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      selectMenus.push(row);
    });

    const submitButton = new ButtonBuilder()
      .setCustomId(`submit_symptoms_${formDate}`)
      .setLabel('Submit Responses')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✅');

    const submitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton);

    return { header, selectMenus, submitRow };
  }

  async postDailyForm(client: Client, questionSetId: number = 1): Promise<void> {
    const channelId = client.discordSettings.ChannelId;

    if (!channelId) {
      console.error('❌ ChannelId not configured in appsettings.json');
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId) as TextChannel;

      if (!channel || !channel.isTextBased()) {
        console.error('❌ Channel not found or is not a text channel');
        return;
      }

      const db = new DatabaseService(client.discordSettings.DbPath);
      let questions: Question[];
      try {
        questions = db.getQuestionsForSet(questionSetId);
      } finally {
        db.close();
      }

      const today = new Date().toISOString().split('T')[0];
      const formData = this.createFormMessage(today, questions);

      await channel.send({ content: formData.header, flags: MessageFlags.SuppressNotifications });

      for (let i = 0; i < questions.length; i++) {
        await channel.send({
          content: `**Q${i + 1}:** ${questions[i].text}`,
          components: [formData.selectMenus[i]],
          flags: MessageFlags.SuppressNotifications
        });
      }

      await channel.send({ components: [formData.submitRow] });

      console.log(`✅ Posted daily symptom form for ${today}`);
    } catch (error) {
      console.error('❌ Error posting daily form:', error);
    }
  }

  setupScheduledForm(client: Client): void {
    cron.schedule('0 18 * * *', () => {
      console.log('⏰ Scheduled time reached, posting daily form...');
      this.postDailyForm(client);
    }, {
      timezone: 'America/Chicago'
    });

    console.log('📅 Scheduled cron job set up for 6:00 PM America/Chicago');
  }
}
