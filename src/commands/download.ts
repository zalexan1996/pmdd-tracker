import { ChatInputCommandInteraction, SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { csvFileExists, getRecordCount, getUserCsvString } from '../csvManager.js';
import { generatePdf } from '../pdfGenerator.js';

export const downloadCommand = {
  data: new SlashCommandBuilder()
    .setName('download')
    .setDescription('Downloads your symptom data as CSV and PDF'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.guildId !== process.env.GUILD_ID) {
      await interaction.reply({ content: '❌ You do not have access to use this command here.', ephemeral: true });
      return;
    }

    try {
      // Defer reply since file operations might take a moment
      await interaction.deferReply();
      
      // Check if CSV file exists
      if (!csvFileExists()) {
        await interaction.editReply('ℹ️ No data file exists yet. Nothing to download.');
        return;
      }
      
      const userId = interaction.user.id;
      
      // Get record count for this user
      const recordCount = await getRecordCount(userId);
      
      if (recordCount === 0) {
        await interaction.editReply('ℹ️ You have no recorded data yet. Nothing to download.');
        return;
      }
      
      // Create CSV attachment from filtered data
      const csvString = await getUserCsvString(userId);
      const csvAttachment = new AttachmentBuilder(Buffer.from(csvString, 'utf-8'), {
        name: 'pmdd_data.csv',
        description: 'PMDD Symptom Tracking Data'
      });
      
      // Generate PDF
      const pdfBuffer = await generatePdf(userId);
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, {
        name: 'pmdd_symptom_tracker.pdf',
        description: 'PMDD Symptom Tracker PDF Report'
      });
      
      await interaction.editReply({
        content: `📊 Here's your symptom data.\n` +
          `Total records: ${recordCount}`,
        files: [csvAttachment, pdfAttachment]
      });
      
      console.log(`📥 CSV + PDF downloaded by ${interaction.user.tag} (${recordCount} records)`);
    } catch (error) {
      console.error('Error downloading data:', error);
      await interaction.editReply('❌ An error occurred while preparing the download.');
    }
  }
};
