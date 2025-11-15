import UserList from "../../audios/userList.json" with { type: "json" };
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VoiceState } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} from "@discordjs/voice";

/**
 * Plays an audio from the list that corresponds to the user that joined voice channel
 * @param {String} path file path of audio
 * @param {VoiceState} voice Voice channel user has currently joined
 */
export function playAudio(path, voice) {
  const audio = createAudioResource(path);
  const connection = joinVoiceChannel({
    channelId: voice.channelId,
    guildId: voice.guild.id,
    adapterCreator: voice.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  connection.subscribe(player);
  player.play(audio);
  player.on(AudioPlayerStatus.Idle, () => connection.destroy());
}

/**
 * Finds path of randomly selected audio corresponding to user
 * @param {string} key Discord user ID
 * @returns path of audio file
 */
export function getAudioFile(key) {
  // Get the project root directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "../..");
  
  // Resolve the audio folder path relative to project root
  const relativePath = !UserList[key] ? "audios/default" : UserList[key].replace(/^\.\.\//, "");
  const sourceFolder = path.resolve(projectRoot, relativePath);
  
  const audioFiles = fs.readdirSync(sourceFolder, (files) => {
    return files;
  });
  const random = Math.floor(Math.random() * audioFiles.length);
  return path.join(sourceFolder, audioFiles[random]);
}
