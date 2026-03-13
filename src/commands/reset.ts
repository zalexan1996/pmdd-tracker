import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { clearAllData, csvFileExists } from '../csvManager.js';

export const resetCommand = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clears all symptom data from the CSV file'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Defer reply since file operations might take a moment
      await interaction.deferReply();
      
      // Check if CSV file exists
      if (!csvFileExists()) {
        await interaction.editReply('ℹ️ No data file exists yet. Nothing to reset.');
        return;
      }
      
      // Clear all data
      await clearAllData();
      
      await interaction.editReply('✅ All symptom data has been cleared from the CSV file.');
      console.log(`🗑️  CSV data reset by ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error resetting CSV:', error);
      await interaction.editReply('❌ An error occurred while resetting the data.');
    }
  }
};
