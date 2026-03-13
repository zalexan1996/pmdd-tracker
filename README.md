# PMDD Tracker 🤖

A Discord bot for tracking PMDD (Premenstrual Dysphoric Disorder) symptoms. Users can submit daily symptom reports through an interactive form, and the data is stored in a CSV file for analysis.

## Features

- 📅 **Automated Daily Forms**: Posts a symptom tracking form every day at 6:00 PM America/Chicago timezone
- 📊 **14 Symptom Questions**: Comprehensive PMDD symptom assessment with severity ratings (1-6 scale)
- 💾 **CSV Data Storage**: All responses are saved with user ID, username, date, and answers
- 🔄 **Duplicate Prevention**: One submission per user per day (newer submissions replace older ones)
- ⚙️ **Slash Commands**: Easy data management with `/reset`, `/download`, and `/pester` commands

## Prerequisites

- Node.js 18.x or higher
- A Discord Bot Token (see setup instructions below)
- Access to a Discord server where you can add the bot

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pmdd-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your Discord credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Discord bot credentials:

```env
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=guild_id
CHANNEL_ID=channel_id
APPLICATION_ID=application_id
```

**How to get these values:**

1. **DISCORD_TOKEN**: 
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application (or create one)
   - Go to "Bot" section
   - Click "Reset Token" and copy the new token

2. **GUILD_ID**: 
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your server and select "Copy Server ID"

3. **CHANNEL_ID**: 
   - Right-click the channel where you want forms posted
   - Select "Copy Channel ID"

4. **APPLICATION_ID**: 
   - Available in the Discord Developer Portal under "General Information"

### 4. Build the Project

```bash
npm run build
```

### 5. Register Slash Commands

Before starting the bot, register the slash commands with Discord:

```bash
npm run deploy-commands
```

You should see output confirming the commands were registered:
```
✅ Successfully registered 3 application (/) commands:
  - /reset: Clears all symptom data from the CSV file
  - /download: Downloads the complete symptom data CSV file
  - /pester: Manually triggers the daily symptom form to be posted right now
```

### 6. Start the Bot

```bash
npm start
```

You should see:
```
✅ PMDD Tracker is ready! Logged in as YourBot#1234
📅 Scheduled daily form posting at 6:00 PM America/Chicago
```

## Usage

### Daily Symptom Form

The bot automatically posts a symptom tracking form every day at 6:00 PM Central Time. The form includes:

- 14 questions about PMDD symptoms
- Each question has a dropdown with severity levels (1-6):
  - **1** - Not at all
  - **2** - Minimal
  - **3** - Mild
  - **4** - Moderate
  - **5** - Severe
  - **6** - Extreme
- A submit button to save responses

Users must answer all 14 questions before submitting.

### Slash Commands

**`/pester`**
- Manually triggers the daily form to be posted immediately
- Useful for testing or if the scheduled post was missed

**`/download`**
- Downloads the complete CSV file with all symptom data
- Shows the total number of records

**`/reset`**
- Clears all data from the CSV file
- **Warning**: This action cannot be undone! Download data first if needed.

## Data Format

The CSV file (`pmdd_data.csv`) has the following structure:

| User ID | Username | Date | Q1 | Q2 | Q3 | ... | Q14 |
|---------|----------|------|----|----|----|----|-----|
| 12345... | user#1234 | 2026-03-13 | 3 | 4 | 2 | ... | 3 |

- **User ID**: Discord user ID (unique identifier)
- **Username**: Discord username with discriminator
- **Date**: Submission date in YYYY-MM-DD format
- **Q1-Q14**: Severity ratings (1-6) for each question

## Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled bot
- `npm run dev` - Build and run in one command
- `npm run watch` - Watch for file changes and recompile
- `npm run deploy-commands` - Register slash commands with Discord

### Project Structure

```
pmdd-tracker/
├── src/
│   ├── index.ts              # Main bot entry point
│   ├── scheduledForm.ts      # Daily form posting logic
│   ├── formHandler.ts        # Form interaction handling
│   ├── csvManager.ts         # CSV read/write operations
│   ├── deploy-commands.ts    # Command registration script
│   └── commands/
│       ├── reset.ts          # /reset command
│       ├── download.ts       # /download command
│       └── pester.ts         # /pester command
├── dist/                     # Compiled JavaScript (generated)
├── pmdd_data.csv            # Symptom data (generated)
├── package.json
├── tsconfig.json
├── .env                     # Environment variables (not in git)
└── .env.example             # Environment template
```

## Troubleshooting

### Bot doesn't respond to slash commands
- Make sure you ran `npm run deploy-commands` after setup
- Verify the bot has proper permissions in your Discord server
- Check that GUILD_ID matches your server

### Scheduled form doesn't post at 6:00 PM
- Verify the server timezone where the bot is running
- Check console logs for any errors
- The bot must be running continuously for scheduled posts

### CSV file issues
- Ensure the bot has write permissions in its directory
- Check console logs for file system errors
- If corrupted, you can delete `pmdd_data.csv` and it will be recreated

### Form submission errors
- Users must answer all 14 questions before submitting
- If responses are lost, they're stored in memory and cleared on bot restart
- Check that the CSV file isn't locked by another program

## Bot Permissions

The bot requires these Discord permissions:
- `Send Messages` - To post daily forms
- `Use Slash Commands` - For command interactions
- `Attach Files` - For /download command
- `Read Message History` - To access interaction context

## License

MIT

## Support

For issues or questions, please contact the server administrators.
