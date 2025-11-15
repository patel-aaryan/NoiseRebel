import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sb from "../../soundboard/sbPaths.json" with { type: "json" };
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const options = Object.keys(sb);

/**
 *
 * @param {string} msg message sent that corresponds to soundboard category
 */
export function getSoundboard() {
  const buttons = new ActionRowBuilder();

  for (let item of options) {
    const button = new ButtonBuilder()
      .setCustomId(item)
      .setLabel(item)
      .setStyle(ButtonStyle.Primary);
    buttons.addComponents(button);
  }

  const body = {
    content: "Selecting a Category",
    components: [buttons],
  };
  return body;
}

/**
 *
 * @param {string} id soundboard category
 * @param {boolean} isDisabled soundboard category
 */
export function getCategory(id) {
  const audios = getAudios(id);
  const buttons = [];

  // Get the project root directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "../..");
  
  // Resolve the soundboard folder path relative to project root
  const relativePath = sb[id].replace(/^\.\.\//, "");
  const resolvedPath = path.resolve(projectRoot, relativePath);

  const buttonVector = [];
  let buttonRow = [];
  for (const element of audios) {
    buttonRow.push(element);
    if (buttonRow.length == 5) {
      buttonVector.push(buttonRow);
      buttonRow = [];
    }
  }
  if (buttonRow.length != 0) buttonVector.push(buttonRow);

  for (let row of buttonVector) {
    const buttonRow = new ActionRowBuilder();
    for (let item of row) {
      const button = new ButtonBuilder()
        .setCustomId(path.join(resolvedPath, item))
        .setLabel(item.substring(0, item.length - 4))
        .setStyle(ButtonStyle.Secondary);
      buttonRow.addComponents(button);
    }
    buttons.push(buttonRow);
  }

  const backButton = new ButtonBuilder()
    .setCustomId("back")
    .setLabel("Back")
    .setStyle(ButtonStyle.Danger);
  const backRow = new ActionRowBuilder().addComponents(backButton);
  buttons.push(backRow);

  const body = {
    content: "Choose a sound to play",
    components: buttons,
  };
  return body;
}

/**
 *
 * @param {string} id sounboard category
 */
function getAudios(id) {
  // Get the project root directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, "../..");
  
  // Resolve the soundboard folder path relative to project root
  const relativePath = sb[id].replace(/^\.\.\//, "");
  const source = path.resolve(projectRoot, relativePath);
  
  const audioFiles = fs.readdirSync(source, (files) => {
    return files;
  });
  return audioFiles;
}
