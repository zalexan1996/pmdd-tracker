import { Client, Collection, Events, GatewayIntentBits, Interaction } from "discord.js";
import { DatabaseService } from "../domain/services/database-service.js";
import { ICommandBase } from "../commands/shared/commandBase.js";
import { ConfigurationManager } from "./configuration-manager.js";
import { DiscordSettings } from "../discord-settings.js";

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, ICommandBase>;
    discordSettings: DiscordSettings;
  }
}

export class Application {
    private db?: DatabaseService;
    private config: ConfigurationManager
    private discordSettings?: DiscordSettings;
    private client?: Client;

    intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ]

    public constructor() {
        this.setupClient();
        this.config = new ConfigurationManager();
    }

    loadConfig(path: string) {
        this.config.loadJson(path)
        this.discordSettings = this.config.bind(DiscordSettings);
        return this;
    }


    setupDatabase(pathOrSelector: string | ((config: ConfigurationManager) => string)) {
        const path = typeof pathOrSelector === 'string'
            ? pathOrSelector
            : pathOrSelector(this.config);

        try {
            this.db = new DatabaseService(path);
            this.db.create();
            this.db.close();
            return this;
        }
        catch {
            throw `❌ Failed to initialize sqlite database.`;
        }
        
    }

    private setupClient() {
        this.client = new Client({
            intents: this.intents
        });

        this.client.commands = new Collection();
        return this;
    }

    registerCommand(command: ICommandBase) {
        if (!this.client) {
            throw '❌ Failed to register commands. Client was null.'
        }

        this.client.commands.set(command.data.name, command);
        return this;
    }

    registerClientRead(listener: (client: Client<true>) => void) {
        if (!this.client) {
            throw '❌ Failed to register ClientReady event. Client was null.'
        }

        this.client.once(Events.ClientReady, listener);
        return this;
    }

    registerClientInteraction(listener: (interaction: Interaction) => void) {
        if (!this.client) {
            throw '❌ Failed to register InteractionCreate event. Client was null.'
        }

        this.client.on(Events.InteractionCreate, listener);
        return this;
    }
    
    async start() {
        if (!this.client) {
            throw '❌ Failed to start application. Client was null.'
        }

        if (!this.discordSettings) {
            throw '❌ Failed to start application. Config not loaded.'
        }
        
        try
        {
            this.client.discordSettings = this.discordSettings;
            let response = await this.client.login(this.discordSettings.DiscordToken)
            console.log('✅ Logged in: ', response)
        }
        catch (error)
        {
            throw `❌ Failed to login: ${error}`
        }
    }
}