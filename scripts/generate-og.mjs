// Run on macOS with Arial installed; generated PNGs are committed.
// Typography only: these images are not product screenshots.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("public/og", { recursive: true });
const cards = [
  {
    name: "home",
    background: "#f8f8f3",
    ink: "#252720",
    label: "ЛЕОНИД МАКАРОВ",
    title: ["Интерфейсы.", "Работающие продукты."],
    subtitle: "Дизайн и собственные проекты",
  },
  {
    name: "kruzhok",
    background: "#e3fa94",
    ink: "#303723",
    label: "ПРИЛОЖЕНИЕ ДЛЯ КОМПЬЮТЕРА",
    title: ["Кружок."],
    subtitle: "Камера поверх окон для видеообъяснений",
  },
  {
    name: "bible",
    background: "#eee8fa",
    ink: "#504177",
    label: "ИГРА В БРАУЗЕРЕ",
    title: ["Откуда", "из Библии?"],
    subtitle: "Угадайте, где в Библии находится стих",
  },
];
for (const card of cards) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${card.background}"/>
    <g fill="${card.ink}" font-family="Arial, sans-serif">
      <path d="M64 97V61h14v22h22v14H64Zm22-36h14v14H86z"/>
      <text x="120" y="87" font-size="24" font-weight="700">ленинблок.</text>
      <text x="64" y="176" font-size="17" letter-spacing="2">${card.label}</text>
      ${card.title.map((line, i) => `<text x="60" y="${285 + i * 98}" font-size="${card.name === "home" ? "79" : "100"}" letter-spacing="-3">${line}</text>`).join("")}
      <text x="64" y="490" font-size="27">${card.subtitle}</text>
      <path d="M64 543H1136" stroke="${card.ink}" stroke-opacity=".25"/>
      <text x="64" y="582" font-size="20">leninblock.ru${card.name === "home" ? "" : "/" + card.name}</text>
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/og/${card.name}.png`);
}

// A PNG-backed ICO keeps the favicon readable at small sizes.
const iconPng = await sharp("src/app/icon.svg").resize(32, 32).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 32;
icoHeader[7] = 32;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(iconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile("src/app/favicon.ico", Buffer.concat([icoHeader, iconPng]));
