// Lightweight id generator. Avoids pulling in the nanoid package;
// fine for demo IDs. Shape: 12-char base36.
export function nanoid(len = 12) {
  const arr = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) {
    out += (arr[i] % 36).toString(36);
  }
  return out;
}
