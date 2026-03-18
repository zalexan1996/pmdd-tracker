import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { CommandBase } from './shared/commandBase.js';
import { DatabaseService } from '../domain/services/database-service.js';
import { DiscordSettings } from '../discord-settings.js';

class ResetCommand extends CommandBase {
  data = new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clears all of your symptom data') as SlashCommandBuilder;

  protected async run(interaction: ChatInputCommandInteraction, _client: Client, settings: DiscordSettings): Promise<void> {
    const db = new DatabaseService(settings.DbPath);
    try {
      const userId = interaction.user.id;
      const removed = db.clearProvidedAnswersForUser(userId);

      if (removed === 0) {
        await interaction.editReply('ℹ️ You have no recorded data to reset.');
        return;
      }

      await interaction.editReply(`✅ Cleared ${removed} record(s) of your symptom data.`);
    } finally {
      db.close();
    }
  }
}

export const resetCommand = new ResetCommand();
