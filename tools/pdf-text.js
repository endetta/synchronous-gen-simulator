#!/usr/bin/env node
/**
 * Ekstraktor teks PDF minimal — hanya untuk PDF dengan stream FlateDecode.
 * Dipakai sekali untuk membaca catatan kuliah MIT OCW 6.685 (sumber primer)
 * yang tidak bisa dirender Read tool karena poppler tidak terpasang.
 *
 * Usage: node tools/pdf-text.js <file.pdf>
 */
const fs = require('fs');
const zlib = require('zlib');

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/pdf-text.js <file.pdf>');
  process.exit(1);
}

const buf = fs.readFileSync(file);
const raw = buf.toString('latin1');
const chunks = [];

// Setiap stream objek: "stream\r?\n" ... "endstream"
const re = /stream\r?\n/g;
let m;
while ((m = re.exec(raw)) !== null) {
  const start = m.index + m[0].length;
  const end = raw.indexOf('endstream', start);
  if (end < 0) continue;
  const slice = buf.subarray(start, end);
  let text = null;
  try {
    text = zlib.inflateSync(slice).toString('latin1');
  } catch (e) {
    try {
      text = zlib.inflateRawSync(slice).toString('latin1');
    } catch (e2) {
      continue; // bukan stream teks terkompresi — lewati
    }
  }
  if (text && /(Tj|TJ)/.test(text)) chunks.push(text);
}

/**
 * Ambil string literal dari operator Tj/TJ dan susun jadi baris.
 * PDF menulis teks sebagai (literal) Tj atau [(a)(b)] TJ.
 */
function extractText(content) {
  const out = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const parts = [];
    // ( ... ) dengan escape \) dan \(
    const sre = /\((?:\\.|[^\\()])*\)/g;
    let sm;
    while ((sm = sre.exec(line)) !== null) {
      let s = sm[0].slice(1, -1);
      s = s.replace(/\\([()\\])/g, '$1')
           .replace(/\\n/g, '\n')
           .replace(/\\r/g, '')
           .replace(/\\t/g, '\t')
           .replace(/\\[0-7]{1,3}/g, (o) => String.fromCharCode(parseInt(o.slice(1), 8)));
      parts.push(s);
    }
    if (!parts.length) continue;
    const joined = parts.join('');
    // TJ dengan angka negatif besar = spasi antar kata
    const withSpaces = line.replace(/\)\s*(-?\d+(?:\.\d+)?)\s*\(/g, (mm, num) => {
      return parseFloat(num) < -100 ? ') ( ' : ')(';
    });
    const parts2 = [];
    let sm2;
    const sre2 = /\((?:\\.|[^\\()])*\)/g;
    while ((sm2 = sre2.exec(withSpaces)) !== null) {
      parts2.push(sm2[0].slice(1, -1));
    }
    const text = (parts2.length ? parts2.join('') : joined)
      .replace(/\\([()\\])/g, '$1')
      .replace(/\\[0-7]{1,3}/g, (o) => String.fromCharCode(parseInt(o.slice(1), 8)));
    if (text.trim()) out.push(text);
  }
  return out;
}

let all = [];
for (const c of chunks) all = all.concat(extractText(c));

const text = all.join('\n')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n');

console.log(text);
