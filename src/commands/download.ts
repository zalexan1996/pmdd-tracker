import { ChatInputCommandInteraction, Client, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { CommandBase } from './shared/commandBase.js';
import { DatabaseService } from '../domain/services/database-service.js';
import { DiscordSettings } from '../discord-settings.js';
import { exportCsv } from '../reporting/services/csvExporter.js';
import { exportPdf } from '../reporting/services/pdfExporter.js';

class DownloadCommand extends CommandBase {
  data = new SlashCommandBuilder()
    .setName('download')
    .setDescription('Downloads your symptom data as CSV and PDF') as SlashCommandBuilder;

  protected async run(interaction: ChatInputCommandInteraction, _client: Client, settings: DiscordSettings): Promise<void> {
    const db = new DatabaseService(settings.DbPath);
    try {
      const userId = interaction.user.id;
      const recordCount = db.getProvidedAnswerCountForUser(userId);

      if (recordCount === 0) {
        await interaction.editReply('ℹ️ You have no recorded data yet. Nothing to download.');
        return;
      }

      const csvString = exportCsv(db, userId);
      const csvAttachment = new AttachmentBuilder(Buffer.from(csvString, 'utf-8'), {
        name: 'pmdd_data.csv',
        description: 'PMDD Symptom Tracking Data'
      });

      const pdfBuffer = await exportPdf(db, userId);
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, {
        name: 'pmdd_symptom_tracker.pdf',
        description: 'PMDD Symptom Tracker PDF Report'
      });

      await interaction.editReply({
        content: `📊 Here's your symptom data.\nTotal records: ${recordCount}`,
        files: [csvAttachment, pdfAttachment]
      });
    } finally {
      db.close();
    }
  }
}

export const downloadCommand = new DownloadCommand();
