import fs from "node:fs";
import path from "node:path";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
} from "@discordjs/voice";

import { query } from "@noise-rebel/infra";
import { getPresignedDownloadUrl } from "@noise-rebel/infra/r2";

const AUDIOS_DIR = process.env.AUDIOS_DIR ?? "/app/audios";

/**
 * Plays an audio file in the given voice state's channel.
 * @param {string} source absolute path or URL to the audio
 * @param {import("discord.js").VoiceState} voice voice state of the joining user
 */
export function playAudio(source, voice) {
  const audio = createAudioResource(source);
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
 * in the user's current voice channel.
 *
 * If the file_path looks like an R2 key (e.g. "audios/<uuid>.mp3"), it fetches
 * a presigned download URL from R2 and streams it. Otherwise it falls back to
 * reading from AUDIOS_DIR on disk (legacy behaviour).
 *
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

  const filePath = rows[0].file_path;

  // R2 key pattern: starts with "audios/" (no leading slash, no absolute path)
  const isR2Key = filePath.startsWith("audios/") && !path.isAbsolute(filePath);

  if (isR2Key) {
    try {
      const url = await getPresignedDownloadUrl(filePath);
      playAudio(url, voice);
    } catch (err) {
      console.error(`[noise-rebel] R2 download failed for ${filePath}:`, err);
    }
    return;
  }

  // Legacy: local file on disk
  const localPath = path.resolve(AUDIOS_DIR, filePath);
  if (!fs.existsSync(localPath)) {
    console.warn(`[noise-rebel] file missing on disk: ${localPath}`);
    return;
  }
  playAudio(localPath, voice);
}
