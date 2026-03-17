import { ChatInputCommandInteraction, SlashCommandBuilder, Client } from 'discord.js';
import { postDailyForm } from '../scheduledForm.js';

export const pesterCommand = {
  data: new SlashCommandBuilder()
    .setName('pester')
    .setDescription('Manually triggers the daily symptom form to be posted right now'),
  
  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (interaction.guildId !== process.env.GUILD_ID) {
      await interaction.reply({ content: '❌ You do not have access to use this command here.', ephemeral: true });
      return;
    }

    try {
      // Defer reply since posting might take a moment
      await interaction.deferReply();
      
      // Post the daily form
      await postDailyForm(client);
      
      await interaction.editReply('✅ Daily symptom form has been posted to the channel!');
      console.log(`📢 Form manually triggered by ${interaction.user.tag}`);
    } catch (error) {
      console.error('Error posting form via /pester:', error);
      await interaction.editReply('❌ An error occurred while posting the form.');
    }
  }
};
