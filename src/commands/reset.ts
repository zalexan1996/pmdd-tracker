import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { clearUserData, csvFileExists } from '../csvManager.js';

export const resetCommand = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clears all of your symptom data from the CSV file'),
  
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
        await interaction.editReply('ℹ️ No data file exists yet. Nothing to reset.');
        return;
      }
      
      const userId = interaction.user.id;
      const removed = await clearUserData(userId);

      if (removed === 0) {
        await interaction.editReply('ℹ️ You have no recorded data to reset.');
        return;
      }

      await interaction.editReply(`✅ Cleared ${removed} record(s) of your symptom data.`);
      console.log(`🗑️  CSV data reset by ${interaction.user.tag} (${removed} records removed)`);
    } catch (error) {
      console.error('Error resetting CSV:', error);
      await interaction.editReply('❌ An error occurred while resetting the data.');
    }
  }
};
