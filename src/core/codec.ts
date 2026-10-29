/** Run-length + base64 codec so large world arrays fit in localStorage. */
export function rleEncode(data: Uint8Array): string {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const v = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === v && run < 255) run++;
    out.push(run, v);
    i += run;
  }
  return toBase64(Uint8Array.from(out));
}

export function rleDecode(text: string, length: number): Uint8Array {
  const bytes = fromBase64(text);
  const out = new Uint8Array(length);
  let p = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    out.fill(bytes[i + 1], p, p + bytes[i]);
    p += bytes[i];
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
