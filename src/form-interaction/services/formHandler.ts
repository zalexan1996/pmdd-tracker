import { StringSelectMenuInteraction, ButtonInteraction } from 'discord.js';
import { DatabaseService } from '../../domain/services/database-service.js';
import { QUESTIONS } from '../constants.js';

// In-memory storage for incomplete form responses
// Key format: "userId_formDate" -> Map of question number (1-based) to answer value
const pendingResponses = new Map<string, Map<number, string>>();

const TOTAL_QUESTIONS = QUESTIONS.length;

/**
 * Handles form component interactions (select menus and submit button)
 */
export async function handleFormInteraction(
  interaction: StringSelectMenuInteraction | ButtonInteraction
) {
  const customId = interaction.customId;

  if (interaction.isStringSelectMenu() && customId.startsWith('symptom_')) {
    await handleSymptomSelection(interaction);
  }

  if (interaction.isButton() && customId.startsWith('submit_symptoms_')) {
    await handleSubmit(interaction);
  }
}

/**
 * Handles when a user selects a severity level for a symptom
 */
async function handleSymptomSelection(interaction: StringSelectMenuInteraction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  // Parse customId: "symptom_1_2026-03-13" -> question number and form date
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

/**
 * Handles when a user clicks the Submit button
 */
async function handleSubmit(interaction: ButtonInteraction) {
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

/**
 * Get the current pending responses (useful for debugging)
 */
export function getPendingResponses(): Map<string, Map<number, string>> {
  return pendingResponses;
}

/**
 * Clear pending responses for a specific user and date (useful for testing)
 */
export function clearPendingResponses(userId: string, formDate: string): void {
  const responseKey = `${userId}_${formDate}`;
  pendingResponses.delete(responseKey);
}
