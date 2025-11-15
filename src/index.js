import { Client, IntentsBitField } from "discord.js";
import { playAudio, getAudioFile } from "./modules/audio.js";
import { getCategory, getSoundboard, options } from "./modules/soundboard.js";
import dotenv from "dotenv";

dotenv.config();

const bot = {
  token: process.env.DISCORD_TOKEN,
  id: process.env.DISCORD_BOT_ID,
};

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

client.on("ready", (c) => console.log(`${c.user.username} is Online!`));

// Voice Channel Join
client.on("voiceStateUpdate", (oldState, newState) => {
  let user = newState.member.user.id;
  // If user joins vc or switches vc
  // and if user joined is not the bot
  if (
    newState.channelId != null &&
    oldState.channelId != newState.channelId && // Handles if user mutes/deafens
    user != bot.id
  ) {
    playAudio(getAudioFile(user), newState);
  }
});

// Soundboard
client.on("messageCreate", (msg) => {
  if (msg.content.toLowerCase() == "-play") {
    msg.channel.send(getSoundboard());
  }
});

client.on("interactionCreate", (interaction) => {
  if (interaction.isButton) {
    const id = interaction.customId;
    if (options.includes(id)) {
      interaction.update(getCategory(id));
    } else if (id == "back") {
      interaction.update(getSoundboard());
    } else {
      const path = interaction.customId;
      const voiceState = interaction.member.voice;
      if (voiceState.channelId != null) {
        playAudio(path, voiceState);
        interaction.deferUpdate();
      } else {
        interaction.reply({
          content: "Join a voice channel first idiot",
          ephemeral: true,
        });
      }
    }
  }
});

client.login(bot.token);
