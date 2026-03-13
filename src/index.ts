import { Client, GatewayIntentBits, Collection, Events, Interaction } from 'discord.js';
import { config } from 'dotenv';
import { setupScheduledForm } from './scheduledForm.js';
import { handleFormInteraction } from './formHandler.js';
import { resetCommand } from './commands/reset.js';
import { downloadCommand } from './commands/download.js';
import { pesterCommand } from './commands/pester.js';

config();

// Extend the Client type to include commands collection
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Initialize commands collection
client.commands = new Collection();
client.commands.set('reset', resetCommand);
client.commands.set('download', downloadCommand);
client.commands.set('pester', pesterCommand);

// Ready event - called when bot successfully logs in
client.once(Events.ClientReady, (c) => {
  console.log(`✅ PMDD Tracker is ready! Logged in as ${c.user.tag}`);
  console.log(`📅 Scheduled daily form posting at 6:00 PM America/Chicago`);
  
  // Set up the scheduled daily form posting
  setupScheduledForm(client);
});

// Interaction event - handles slash commands and component interactions
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      await command.execute(interaction, client);
    }
    
    // Handle form component interactions (select menus and submit button)
    if (interaction.isStringSelectMenu() || interaction.isButton()) {
      await handleFormInteraction(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Try to respond to the user with an error message
    const errorMessage = '❌ An error occurred while processing your request.';
    
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
});

// Log in to Discord
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ DISCORD_TOKEN not found in .env file');
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});
