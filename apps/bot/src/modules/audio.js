import fs from "node:fs";
import path from "node:path";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} from "@discordjs/voice";

import { query } from "@noise-rebel/db";

const AUDIOS_DIR = process.env.AUDIOS_DIR ?? "/app/audios";

/**
 * Plays an audio file in the given voice state's channel.
 * @param {string} filePath absolute path to the audio file
 * @param {import("discord.js").VoiceState} voice voice state of the joining user
 */
export function playAudio(filePath, voice) {
  const audio = createAudioResource(filePath);
  const connection = joinVoiceChannel({
    channelId: voice.channelId,
    guildId: voice.guild.id,
    adapterCreator: voice.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
  });

  connection.subscribe(player);
  player.play(audio);
  player.on(AudioPlayerStatus.Idle, () => connection.destroy());
}

/**
 * Picks a random APPROVED clip for `targetDiscordId` from the DB and plays it
 * in the user's current voice channel. Reads the file from AUDIOS_DIR.
 * @param {string} targetDiscordId discord user id of the user that joined
 * @param {import("discord.js").VoiceState} voice voice state of that user
 */
export async function playForUser(targetDiscordId, voice) {
  const { rows } = await query(
    `SELECT file_path FROM requests
     WHERE target_discord_id = $1
        AND status = 'APPROVED'
       AND file_path IS NOT NULL
     ORDER BY random()
     LIMIT 1`,
    [targetDiscordId]
  );
  if (rows.length === 0) return;

  const filePath = path.resolve(AUDIOS_DIR, rows[0].file_path);
  if (!fs.existsSync(filePath)) {
    console.warn(`[noise-rebel] file missing on disk: ${filePath}`);
    return;
  }
  playAudio(filePath, voice);
}
