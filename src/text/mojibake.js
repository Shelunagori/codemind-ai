// Text that was UTF-8 but got decoded as Windows-1252 or Latin-1 somewhere upstream reads
// "UbicaciÃ³n" or "Itâ€™s". Each byte 0x80-0xFF maps back from its Windows-1252 character
// (0x80-0x9F differ from Latin-1) and from its Latin-1 character.
const CP1252_80_TO_9F = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
];
const BYTE_FOR_CHAR = new Map();
for (let byte = 0x80; byte <= 0xff; byte += 1) {
  BYTE_FOR_CHAR.set(String.fromCharCode(byte), byte);
  if (byte < 0xa0) BYTE_FOR_CHAR.set(String.fromCharCode(CP1252_80_TO_9F[byte - 0x80]), byte);
}
const CONTINUATION_CHARS = [...BYTE_FOR_CHAR].filter(([, byte]) => byte < 0xc0).map(([char]) => char).join('');
// A UTF-8 lead byte (0xC2-0xF4) followed by continuation bytes (0x80-0xBF), as characters.
const MOJIBAKE_SEQUENCE = new RegExp(`[${String.fromCharCode(0xc2)}-${String.fromCharCode(0xf4)}][${CONTINUATION_CHARS}]{1,3}`, 'g');
const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

/** Repairs UTF-8 text that was decoded as Windows-1252 ("SeÃ±or" -> "Señor"); anything else is left as is. */
export function repairMojibake(text) {
  return String(text || '').replace(MOJIBAKE_SEQUENCE, (sequence) => {
    const bytes = [...sequence].map((char) => BYTE_FOR_CHAR.get(char));
    const length = bytes[0] >= 0xf0 ? 4 : bytes[0] >= 0xe0 ? 3 : 2;
    if (bytes.length < length) return sequence;
    try {
      return strictUtf8.decode(Uint8Array.from(bytes.slice(0, length))) + sequence.slice(length);
    } catch {
      return sequence;
    }
  });
}
