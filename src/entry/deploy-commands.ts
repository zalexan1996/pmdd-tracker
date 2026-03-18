import { REST, Routes } from 'discord.js';
import { resetCommand } from '../commands/reset.js';
import { downloadCommand } from '../commands/download.js';
import { pesterCommand } from '../commands/pester.js';
import { ConfigurationManager } from '../core/configuration-manager.js';
import { DiscordSettings } from '../discord-settings.js';

const config = new ConfigurationManager();
config.loadJson('appsettings.json');
const settings = config.bind(DiscordSettings);

const commands = [
  resetCommand.data.toJSON(),
  downloadCommand.data.toJSON(),
  pesterCommand.data.toJSON()
];

const { DiscordToken: token, GuildId: guildId, ApplicationId: applicationId } = settings;

if (!token || !guildId || !applicationId) {
  console.error('❌ Missing required configuration:');
  if (!token) console.error('  - DiscordToken');
  if (!guildId) console.error('  - GuildId');
  if (!applicationId) console.error('  - ApplicationId');
  process.exit(1);
}

const rest = new REST().setToken(token);

async function deployCommands() {
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);
    
    // Register commands to the specific guild
    const data = await rest.put(
      Routes.applicationGuildCommands(applicationId!, guildId!),
      { body: commands }
    ) as any[];
    
    console.log(`✅ Successfully registered ${data.length} application (/) commands:`);
    data.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
    
    console.log('\n📝 Commands are now available in your Discord server!');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();
