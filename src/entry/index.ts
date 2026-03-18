import { setupScheduledForm } from '../form-interaction/services/scheduledForm.js';
import { handleFormInteraction } from '../form-interaction/services/formHandler.js';
import { resetCommand } from '../commands/reset.js';
import { downloadCommand } from '../commands/download.js';
import { pesterCommand } from '../commands/pester.js';
import { Application } from '../core/application.js';
import { DiscordSettings } from '../discord-settings.js';
import { Interaction } from 'discord.js';

const app = new Application()
  .loadConfig('appsettings.json')
  .setupDatabase(cfg => cfg.bind(DiscordSettings).DbPath)
  .registerCommand(resetCommand)
  .registerCommand(downloadCommand)
  .registerCommand(pesterCommand)
  .registerClientRead((c) => {
    console.log(`✅ PMDD Tracker is ready! Logged in as ${c.user.tag}`);
    console.log(`📅 Scheduled daily form posting at 6:00 PM America/Chicago`);
    setupScheduledForm(c);
  })
  .registerClientInteraction(onInteraction)

app.start();




async function onInteraction(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }
      await command.execute(interaction, interaction.client, interaction.client.discordSettings);
    }

    if (interaction.isStringSelectMenu() || interaction.isButton()) {
      await handleFormInteraction(interaction);
    }
  } 
  catch (error) {
    console.error('Error handling interaction:', error);

    const errorMessage = '❌ An error occurred while processing your request.';
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      }
      else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
}