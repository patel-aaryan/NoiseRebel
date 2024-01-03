import UserList from "../../audios/userList.json" assert { type: "json" };
import fs from "fs";
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
  const sourceFolder = !UserList[key] ? "../audios/default" : UserList[key];
  const audioFiles = fs.readdirSync(sourceFolder, (files) => {
    return files;
  });
  const random = Math.floor(Math.random() * audioFiles.length);
  return `${sourceFolder}/${audioFiles[random]}`;
}
