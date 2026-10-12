// Подготовка фото для сайта (работает на Windows, macOS и Linux).
// Один раз: npm install
// Запуск:   node tools/photo.mjs <файл> <папка> <имя> [--crop-right <пикселей>]
//   папка: dishes (главное фото рецепта), steps (фото шага), articles, about
//   имя:   латиницей через дефис, например borshch или borshch-step-1
// Делает src/img/<папка>/<имя>-800.jpg и .avif, а если фото шире 1200 px — ещё <имя>-1600.jpg и .avif.
// --crop-right срезает полосу справа (например, наклейку-эмодзи с обложки ролика).

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [src, dir, name] = process.argv.slice(2);
const cropIdx = process.argv.indexOf("--crop-right");
const cropRight = cropIdx > 0 ? Number(process.argv[cropIdx + 1]) : 0;
const DIRS = ["dishes", "steps", "articles", "about"];

if (!src || !DIRS.includes(dir) || !/^[a-z0-9-]+$/.test(name || "")) {
  console.error("Использование: node tools/photo.mjs <файл> <dishes|steps|articles|about> <имя-латиницей> [--crop-right N]");
  process.exit(1);
}

const outDir = path.join(ROOT, "src/img", dir);
fs.mkdirSync(outDir, { recursive: true });

let image = sharp(src).rotate(); // учитывает поворот с телефона
const meta = await image.metadata();
const width = (meta.autoOrient?.width ?? meta.width) - cropRight;
const height = meta.autoOrient?.height ?? meta.height;
if (cropRight > 0) image = image.extract({ left: 0, top: 0, width, height });
const buffer = await image.toBuffer();

const sizes = dir === "steps" ? [800] : [800, ...(width >= 1200 ? [1600] : [])];
for (const size of sizes) {
  const w = Math.min(size, width);
  const base = path.join(outDir, `${name}-${size}`);
  await sharp(buffer).resize({ width: w }).jpeg({ quality: 76, mozjpeg: true }).toFile(`${base}.jpg`);
  await sharp(buffer).resize({ width: w }).avif({ quality: 55 }).toFile(`${base}.avif`);
  console.log(`готово: src/img/${dir}/${name}-${size}.jpg и .avif (${w}px)`);
}
