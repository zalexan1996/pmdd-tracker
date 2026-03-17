import { Client, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, TextChannel, MessageFlags } from 'discord.js';
import cron from 'node-cron';

// The 15 PMDD symptom questions from the form
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
  "At least one of the problems noted above interfered with relationships with others",
  "Are you on your period?"
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

const yesNoOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' }
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
    `\t**1** - Not at all\n\t**2** - Minimal\n\t**3** - Mild\n\t**4** - Moderate\n\t**5** - Severe\n\t**6** - Extreme\n\n`;
  
  const selectMenus: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
  
  questions.forEach((question, index) => {
    const options = index === questions.length - 1 ? yesNoOptions : severityOptions;
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`symptom_${index + 1}_${formDate}`)
      .setPlaceholder(`Q${index + 1}: Provide a response`)
      .addOptions(options);
    
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
    
    // Send header message (silent)
    await channel.send({ content: formData.header, flags: MessageFlags.SuppressNotifications });

    // Send one message per question (silent), then submit message with notification
    for (let i = 0; i < questions.length; i++) {
      await channel.send({
        content: `**Q${i + 1}:** ${questions[i]}`,
        components: [formData.selectMenus[i]],
        flags: MessageFlags.SuppressNotifications
      });
    }

    // Final submit message — no SuppressNotifications so it triggers a notification
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
