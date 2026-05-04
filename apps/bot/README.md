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

2. Create `apps/bot/.env.local` (or use `pnpm`/repo scripts to pull secrets) with your Discord bot credentials:

   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_BOT_ID=your_discord_bot_id_here
   ```

3. Configure **join sounds** and the **soundboard** (see [Join sounds and soundboard config](#join-sounds-and-soundboard-config) below). Add at least one audio file (for example `.mp3`) in each folder you reference so the bot always has something to pick.

4. Run the bot:

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

## Join sounds and soundboard config

Two JSON maps tell the bot where to load audio from. Paths are resolved from the **repository root** (the code strips a leading `../` segment if present).

### `audios/userList.json` — voice join clips

| Concept              | Details                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shape**            | Object whose keys are **Discord user IDs** (snowflakes) and whose values are **relative directory paths** to a folder of audio files.                                                                           |
| **Keys**             | Enable _Developer Mode_ in Discord (User Settings → App Settings → Advanced), then right‑click a user and choose _Copy User ID_.                                                                                |
| **Values**           | Prefer `../audios/<folder_name>` so the folder lives at `audios/<folder_name>` next to this file. Each folder should contain playable files; one file is chosen at random when that user joins a voice channel. |
| **Users not listed** | The code falls back to `audios/default`. Keep that folder and add clips there, or add an entry for each user you care about.                                                                                    |

Example (replace the placeholder ID with a real one):

```json
{
  "123456789012345678": "../audios/my-user"
}
```

### `soundboard/sbPaths.json` — `-play` categories

| Concept    | Details                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shape**  | Object whose keys are **soundboard category names** and whose values are paths to folders of clips for that category.                                                                                |
| **Keys**   | Used as Discord **button labels** and as internal category IDs for the first step of the soundboard flow. Use short, URL‑safe labels (no spaces if you want fewer surprises in `customId` handling). |
| **Values** | Prefer `../soundboard/<folder_name>` so audio lives under `soundboard/<folder_name>`. The bot lists every file in that directory as a playable sound in the second step.                             |

Example:

```json
{
  "memes": "../soundboard/memes",
  "quotes": "../soundboard/quotes"
}
```

The committed repo ships with minimal **template** folders (`memes`, `quotes`, `my-user`, `default`). Rename them, duplicate the pattern in JSON, and drop in your own audio files as needed.

## Usage

- Type `-play` in any channel to open the soundboard menu
- The bot will automatically play audio when users join voice channels (if they have a custom audio configured)
