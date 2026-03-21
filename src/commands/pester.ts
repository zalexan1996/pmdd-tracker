import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { CommandBase } from './shared/commandBase.js';
import { DiscordSettings } from '../discord-settings.js';
import { FormService } from '../form-interaction/services/formService.js';

class PesterCommand extends CommandBase {
  data = new SlashCommandBuilder()
    .setName('pester')
    .setDescription('Manually triggers the daily symptom form to be posted right now') as SlashCommandBuilder;

  protected async run(interaction: ChatInputCommandInteraction, client: Client, _settings: DiscordSettings): Promise<void> {
    const formService = new FormService();
    await formService.postDailyForm(client);
    await interaction.editReply('✅ Daily symptom form has been posted to the channel!');
  }
}

export const pesterCommand = new PesterCommand();
