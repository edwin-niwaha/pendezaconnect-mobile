// Original three-note notification chime, generated without external audio assets.
// Run with: node scripts/generate-notification-sound.cjs
const fs = require("node:fs");
const { Buffer } = require("node:buffer");
const path = require("node:path");
const rate = 44100;
const duration = 1.35;
const samples = Math.round(rate * duration);
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // PCM
wav.writeUInt16LE(1, 22); // Mono
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 2, 40);
const notes = [[0, 659.255], [0.19, 830.609], [0.38, 987.767]];
for (let index = 0; index < samples; index++) {
  const time = index / rate;
  let value = 0;
  for (const [start, frequency] of notes) {
    const t = time - start;
    if (t < 0) continue;
    const envelope = Math.min(t / 0.008, 1) * Math.exp(-t * 7);
    value += envelope * (Math.sin(2 * Math.PI * frequency * t)
      + 0.18 * Math.sin(2 * Math.PI * frequency * 2 * t));
  }
  const fade = Math.min(1, (duration - time) / 0.1);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * 0.42 * fade)) * 32767), 44 + index * 2);
}
for (const relative of ["assets/sounds/pendeza_chime.wav", "android/app/src/main/res/raw/pendeza_chime.wav"]) {
  const target = path.resolve(__dirname, "..", relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, wav);
}
