import { Client, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextChannel, MessageFlags } from 'discord.js';
import cron from 'node-cron';
import { QUESTIONS, SEVERITY_OPTIONS, YES_NO_OPTIONS } from '../constants.js';

/**
 * Creates the form message with all select menus and a submit button
 * @param formDate The date this form is for (YYYY-MM-DD format)
 */
export function createFormMessage(formDate: string) {
  const header = `📋 **Daily PMDD Symptom Tracker - ${formDate}**\n\n` +
    `Please rate each symptom according to severity:\n` +
    `\t**1** - Not at all\n\t**2** - Minimal\n\t**3** - Mild\n\t**4** - Moderate\n\t**5** - Severe\n\t**6** - Extreme\n\n`;

  const selectMenus: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

  QUESTIONS.forEach((question, index) => {
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

/**
 * Posts the daily symptom form to the configured channel
 */
export async function postDailyForm(client: Client) {
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

    const today = new Date().toISOString().split('T')[0];
    const formData = createFormMessage(today);

    await channel.send({ content: formData.header, flags: MessageFlags.SuppressNotifications });

    for (let i = 0; i < QUESTIONS.length; i++) {
      await channel.send({
        content: `**Q${i + 1}:** ${QUESTIONS[i].text}`,
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

/**
 * Sets up the scheduled daily form posting at 6:00 PM America/Chicago
 */
export function setupScheduledForm(client: Client) {
  cron.schedule('0 22 * * *', () => {
    console.log('⏰ Scheduled time reached, posting daily form...');
    postDailyForm(client);
  }, {
    timezone: 'America/Chicago'
  });

  console.log('📅 Scheduled cron job set up for 6:00 PM America/Chicago');
}
