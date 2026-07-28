#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; // npm install node-fetch if not using built-in fetch in Node 18+

// 1) Build absolute paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust to your actual file paths
const appDataPath = path.resolve(__dirname, './src/static/data/app.model.json');
const imgsDir = path.resolve(__dirname, './src/static/imgs');

// 2) Ensure the imgsDir exists
if (!fs.existsSync(imgsDir)) {
  fs.mkdirSync(imgsDir, { recursive: true });
}

// 3) Read and parse app.model.json
let rawData;
try {
  rawData = fs.readFileSync(appDataPath, 'utf8');
} catch (err) {
  console.error(`Error reading file ${appDataPath}:`, err);
  process.exit(1);
}

let appData;
try {
  appData = JSON.parse(rawData);
} catch (err) {
  console.error(`Error parsing JSON in ${appDataPath}:`, err);
  process.exit(1);
}

function getFileNameFromUrl(imgUrl) {
  try {
    const urlObj = new URL(imgUrl);

    // e.g. urlObj.pathname = "/photos/911758/pexels-photo-911758.jpeg"
    let fileName = path.basename(urlObj.pathname);
    // e.g. "pexels-photo-911758.jpeg"

    // If no dot, fallback to .jpg
    if (!fileName.includes('.')) {
      fileName += '.jpg';
    }

    return fileName;
  } catch (err) {
    console.warn('img tool error', err);
    // If parsing fails or the URL is invalid, fallback to something safe:
    return `image-${Date.now()}.jpg`;
  }
}

/**
 * Recursively walk the nested content arrays.
 * For each item, if it has an imgUrl, fetch and save locally, update the field.
 */
async function walkContentArray(contentArr) {
  if (!Array.isArray(contentArr)) return;

  for (const item of contentArr) {
    if (item?.img?.imgUrl) {
      // 2a) fetch the image
      const newUrl = await fetchAndSave(item.img.imgUrl);
      // 2c) update the imgUrl
      item.img.imgUrl = newUrl;
    }

    // If item has nested content, recurse
    if (Array.isArray(item.content)) {
      await walkContentArray(item.content);
    }
  }
}

/**
 * Fetch the image from `imgUrl`, save to `imgsDir` with a suitable name,
 * and return the updated relative path (e.g. `imgs/photo.jpg`).
 */
async function fetchAndSave(imgUrl) {
  let res;
  try {
    res = await fetch(imgUrl);
  } catch (err) {
    console.error(`Error fetching ${imgUrl}:`, err);
    return imgUrl; // fallback: leave original
  }

  if (!res.ok) {
    console.error(`Non-OK response fetching ${imgUrl}: ${res.status}`);
    return imgUrl; // fallback
  }

  // 2b) generate a name & save
  const fileName = getFileNameFromUrl(imgUrl);
  const localFilePath = path.join(imgsDir, fileName);

  try {
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(`Error writing file ${localFilePath}:`, err);
    return imgUrl; // fallback
  }

  // return new relative path
  return `imgs/${fileName}`;
}

/**
 * Main async function
 */
async function main() {
  // We assume appData might have `content: [...]` at top level
  // or at multiple levels. We'll check if there's a `content` array
  // and walk it.
  if (Array.isArray(appData.content)) {
    await walkContentArray(appData.content);
  }

  // If your structure might have multiple fields, do that for each.

  // 3) save revised appData
  fs.writeFileSync(appDataPath, JSON.stringify(appData, null, 2), 'utf8');
}

// Run
main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
