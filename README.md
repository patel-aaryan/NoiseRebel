# NoiseRebel

A Discord bot that plays custom audio clips when users join voice channels and provides an interactive soundboard feature.

## Features

- **Custom Join Sounds**: Automatically plays personalized audio clips when users join or switch voice channels
- **Interactive Soundboard**: Use the `-play` command to access a categorized soundboard with various audio clips

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with your Discord bot credentials:

   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_BOT_ID=your_discord_bot_id_here
   ```

3. Run the bot:

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

## Usage

- Type `-play` in any channel to open the soundboard menu
- The bot will automatically play audio when users join voice channels (if they have a custom audio configured)
