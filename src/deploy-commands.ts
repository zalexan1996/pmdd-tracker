import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { resetCommand } from './commands/reset.js';
import { downloadCommand } from './commands/download.js';
import { pesterCommand } from './commands/pester.js';

config();

const commands = [
  resetCommand.data.toJSON(),
  downloadCommand.data.toJSON(),
  pesterCommand.data.toJSON()
];

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const applicationId = process.env.APPLICATION_ID;

if (!token || !guildId || !applicationId) {
  console.error('❌ Missing required environment variables:');
  if (!token) console.error('  - DISCORD_TOKEN');
  if (!guildId) console.error('  - GUILD_ID');
  if (!applicationId) console.error('  - APPLICATION_ID');
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
