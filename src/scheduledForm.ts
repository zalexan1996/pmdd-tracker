import { Client, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import cron from 'node-cron';

// The 14 PMDD symptom questions from the form
const questions = [
  "Felt depressed, sad, down, or blue or felt hopeless; or felt worthless or guilty",
  "Felt anxious, tense, keyed up or on edge",
  "Had mood swings (i.e., suddenly feeling sad or tearful) or was sensitive to rejection or feelings were easily hurt",
  "Felt angry or irritable",
  "Had less interest in usual activities (work, school, friends, hobbies)",
  "Had difficulty concentrating",
  "Felt lethargic, tired, or fatigued; or had lack of energy",
  "Had increased appetite or overate; or had cravings for specific foods",
  "Slept more, took naps, found it hard to get up when intended; or had trouble getting to sleep or staying asleep",
  "Felt overwhelmed or unable to cope; or felt out of control",
  "Had breast tenderness, breast swelling, bloated sensation, weight gain, headache, joint or muscle pain, or other physical symptoms",
  "At work, school, home, or in daily routine, at least one of the problems noted above caused reduction of production of efficiency",
  "At least one of the problems noted above caused avoidance of or less participation in hobbies or social activities",
  "At least one of the problems noted above interfered with relationships with others"
];

// Create severity options for the select menus
const severityOptions = [
  { label: '1 - Not at all', value: '1' },
  { label: '2 - Minimal', value: '2' },
  { label: '3 - Mild', value: '3' },
  { label: '4 - Moderate', value: '4' },
  { label: '5 - Severe', value: '5' },
  { label: '6 - Extreme', value: '6' }
];

/**
 * Creates the form message with all 14 select menus and a submit button
 * @param formDate The date this form is for (YYYY-MM-DD format)
 */
export function createFormMessage(formDate: string) {
  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
  
  // Create header message
  const header = `📋 **Daily PMDD Symptom Tracker - ${formDate}**\n\n` +
    `Please rate each symptom according to severity:\n` +
    `**1** - Not at all | **2** - Minimal | **3** - Mild | **4** - Moderate | **5** - Severe | **6** - Extreme\n\n`;
  
  // Create 14 select menus (one for each question)
  // Note: Discord allows max 5 ActionRows per message, and each ActionRow can contain 1 select menu
  // So we need to split into multiple messages OR use a modal. For now, we'll use 5 messages
  // Actually, let's reconsider: we can send multiple messages or use a single message with buttons
  // that open modals. For simplicity, let's create select menus in batches.
  
  // Discord limit: 5 ActionRows per message, 1 select menu per ActionRow
  // We have 14 questions + 1 submit button = need at least 3 messages
  
  // For now, let's create all 14 select menus + button (we'll send in batches)
  const selectMenus: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
  
  questions.forEach((question, index) => {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`symptom_${index + 1}_${formDate}`)
      .setPlaceholder(`Question ${index + 1}: Select severity`)
      .addOptions(severityOptions);
    
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    selectMenus.push(row);
  });
  
  // Create submit button with the formDate embedded in the customId
  const submitButton = new ButtonBuilder()
    .setCustomId(`submit_symptoms_${formDate}`)
    .setLabel('Submit Responses')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('✅');
  
  const submitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton);
  
  return {
    header,
    selectMenus,
    submitRow,
    questions
  };
}

/**
 * Posts the daily symptom form to the configured channel
 */
export async function postDailyForm(client: Client) {
  const channelId = process.env.CHANNEL_ID;
  
  if (!channelId) {
    console.error('❌ CHANNEL_ID not configured in .env');
    return;
  }
  
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel;
    
    if (!channel || !channel.isTextBased()) {
      console.error('❌ Channel not found or is not a text channel');
      return;
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    const formData = createFormMessage(today);
    
    // Send header message
    await channel.send(formData.header);
    
    // Discord allows 5 ActionRows per message, so we'll send in batches
    // Message 1: Questions 1-5
    await channel.send({
      content: `**Questions 1-5:**\n` +
        formData.questions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n\n'),
      components: formData.selectMenus.slice(0, 5)
    });
    
    // Message 2: Questions 6-10
    await channel.send({
      content: `**Questions 6-10:**\n` +
        formData.questions.slice(5, 10).map((q, i) => `${i + 6}. ${q}`).join('\n\n'),
      components: formData.selectMenus.slice(5, 10)
    });
    
    // Message 3: Questions 11-14 + Submit button
    await channel.send({
      content: `**Questions 11-14:**\n` +
        formData.questions.slice(10, 14).map((q, i) => `${i + 11}. ${q}`).join('\n\n'),
      components: [...formData.selectMenus.slice(10, 14), formData.submitRow]
    });
    
    console.log(`✅ Posted daily symptom form for ${today}`);
  } catch (error) {
    console.error('❌ Error posting daily form:', error);
  }
}

/**
 * Sets up the scheduled daily form posting at 6:00 PM America/Chicago
 */
export function setupScheduledForm(client: Client) {
  // Cron expression: '0 18 * * *' = At 18:00 (6:00 PM) every day
  // Note: node-cron runs in the system's local timezone by default
  // To ensure it runs at 6:00 PM America/Chicago, we specify timezone
  cron.schedule('0 22 * * *', () => {
    console.log('⏰ Scheduled time reached, posting daily form...');
    postDailyForm(client);
  }, {
    timezone: 'America/Chicago'
  });
  
  console.log('📅 Scheduled cron job set up for 6:00 PM America/Chicago');
}
