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

const AUDIOS_DIR = process.env.AUDIOS_DIR ?? "/app/audios";

/**
 * Plays an audio file in the given voice state's channel.
 * @param {string} source absolute path to the audio file on disk
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
 * Resolves `file_path` to an absolute path under AUDIOS_DIR, or null if invalid.
 * @param {string} filePath path relative to AUDIOS_DIR (e.g. "<uuid>.mp3")
 */
function resolveUnderAudiosDir(filePath) {
  if (path.isAbsolute(filePath)) return null;
  const root = path.resolve(AUDIOS_DIR);
  const candidate = path.resolve(root, filePath);
  const rel = path.relative(root, candidate);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return candidate;
}

/**
 * Picks a random APPROVED clip for `targetDiscordId` from the DB and plays it
 * in the user's current voice channel. Audio is always read from disk under
 * AUDIOS_DIR; `file_path` must be relative to that directory.
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
  const localPath = resolveUnderAudiosDir(filePath);
  if (!localPath) {
    console.warn(`[noise-rebel] invalid or unsafe file_path: ${filePath}`);
    return;
  }
  if (!fs.existsSync(localPath)) {
    console.warn(`[noise-rebel] file missing on disk: ${localPath}`);
    return;
  }
  playAudio(localPath, voice);
}
