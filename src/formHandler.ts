import { StringSelectMenuInteraction, ButtonInteraction } from 'discord.js';
import { saveSymptomData } from './csvManager.js';

// In-memory storage for incomplete form responses
// Key format: "userId_formDate" -> Map of question number to answer
const pendingResponses = new Map<string, Map<number, string>>();

/**
 * Handles form component interactions (select menus and submit button)
 */
export async function handleFormInteraction(
  interaction: StringSelectMenuInteraction | ButtonInteraction
) {
  const customId = interaction.customId;
  
  // Handle select menu interactions (symptom severity selections)
  if (interaction.isStringSelectMenu() && customId.startsWith('symptom_')) {
    await handleSymptomSelection(interaction);
  }
  
  // Handle submit button interaction
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
  
  // Get the selected value
  const selectedValue = interaction.values[0];
  
  // Store the response in memory
  const responseKey = `${userId}_${formDate}`;
  
  if (!pendingResponses.has(responseKey)) {
    pendingResponses.set(responseKey, new Map());
  }
  
  const userResponses = pendingResponses.get(responseKey)!;
  userResponses.set(questionNumber, selectedValue);
  
  // Count how many questions have been answered
  const answeredCount = userResponses.size;
  
  // Acknowledge the selection
  await interaction.reply({
    content: `✅ Question ${questionNumber} recorded (${selectedValue}/6). Progress: ${answeredCount}/14 questions answered.`,
    ephemeral: true
  });
  
  console.log(`📝 User ${interaction.user.tag} answered Q${questionNumber}: ${selectedValue}`);
}

/**
 * Handles when a user clicks the Submit button
 */
async function handleSubmit(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const username = interaction.user.tag;
  
  // Parse customId: "submit_symptoms_2026-03-13" -> form date
  const formDate = customId.replace('submit_symptoms_', '');
  
  const responseKey = `${userId}_${formDate}`;
  const userResponses = pendingResponses.get(responseKey);
  
  // Validate that all 14 questions have been answered
  if (!userResponses || userResponses.size !== 14) {
    const answeredCount = userResponses ? userResponses.size : 0;
    const missingQuestions: number[] = [];
    
    for (let i = 1; i <= 14; i++) {
      if (!userResponses || !userResponses.has(i)) {
        missingQuestions.push(i);
      }
    }
    
    await interaction.reply({
      content: `❌ Please answer all 14 questions before submitting.\n` +
        `You've answered ${answeredCount}/14 questions.\n` +
        `Missing questions: ${missingQuestions.join(', ')}`,
      ephemeral: true
    });
    return;
  }
  
  // Convert responses to array format for CSV
  const responses: string[] = [];
  for (let i = 1; i <= 14; i++) {
    responses.push(userResponses.get(i)!);
  }
  
  try {
    // Defer reply since CSV operations might take a moment
    await interaction.deferReply({ ephemeral: true });
    
    // Save to CSV
    await saveSymptomData(userId, username, formDate, responses);
    
    // Clear the pending responses for this user and date
    pendingResponses.delete(responseKey);
    
    // Send success message
    await interaction.editReply({
      content: `✅ Thank you! Your symptom data for ${formDate} has been recorded.\n` +
        `Your responses have been saved to the tracking system.`
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
