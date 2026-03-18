import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';
import { DiscordSettings } from '../../discord-settings.js';

export interface ICommandBase {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction, client: Client, settings: DiscordSettings): Promise<void>;
}

export abstract class CommandBase implements ICommandBase {
    abstract data: SlashCommandBuilder;

    async execute(interaction: ChatInputCommandInteraction, client: Client, settings: DiscordSettings): Promise<void> {
        const commandName = interaction.commandName;
        const userTag = interaction.user.tag;

        if (interaction.guildId !== settings.GuildId) {
            await interaction.reply({ content: '❌ You do not have access to use this command here.', ephemeral: true });
            return;
        }

        console.log(`▶️  /${commandName} invoked by ${userTag}`);

        try {
            await interaction.deferReply();
            await this.run(interaction, client, settings);
        } catch (error) {
            console.error(`❌ Error in /${commandName}:`, error);
            const errorMessage = '❌ An error occurred while processing your request.';
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }

        console.log(`✅ /${commandName} completed for ${userTag}`);
    }

    protected abstract run(interaction: ChatInputCommandInteraction, client: Client, settings: DiscordSettings): Promise<void>;
}