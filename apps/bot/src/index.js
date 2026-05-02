import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import dotenv from "dotenv"
import { Client, IntentsBitField } from "discord.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../../..")

for (const file of [
  path.join(repoRoot, "apps/bot/.env"),
  path.join(repoRoot, "packages/infra/.env.local"),
]) {
  if (fs.existsSync(file)) dotenv.config({ path: file })
}

const { playAudio, playForUser } = await import("./modules/audio.js")
const { getCategory, getSoundboard, options } = await import(
  "./modules/soundboard.js"
)

const bot = {
  token: process.env.DISCORD_TOKEN,
  id: process.env.DISCORD_BOT_ID,
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
})

client.on("clientReady", (c) => console.log(`${c.user.username} is Online!`))

// Voice channel join: play the user's APPROVED join sound from the DB.
client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.member?.user.id
  if (!userId) return
  if (
    newState.channelId != null &&
    oldState.channelId != newState.channelId &&
    userId !== bot.id
  ) {
    playForUser(userId, newState).catch((err) =>
      console.error("[noise-rebel] playForUser failed", err)
    )
  }
})

// Soundboard
client.on("messageCreate", (msg) => {
  if (msg.content.toLowerCase() == "-play") {
    msg.channel.send(getSoundboard())
  }
})

client.on("interactionCreate", (interaction) => {
  if (interaction.isButton) {
    const id = interaction.customId
    if (options.includes(id)) {
      interaction.update(getCategory(id))
    } else if (id == "back") {
      interaction.update(getSoundboard())
    } else {
      const filePath = interaction.customId
      const voiceState = interaction.member.voice
      if (voiceState.channelId == null) {
        interaction.reply({
          content: "Join a voice channel first idiot",
          ephemeral: true,
        })
      } else {
        playAudio(filePath, voiceState)
        interaction.deferUpdate()
      }
    }
  }
})

client.login(bot.token)
