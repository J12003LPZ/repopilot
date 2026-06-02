import { customAlphabet, nanoid } from "nanoid";

const publicAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const publicNano = customAlphabet(publicAlphabet, 10);

export function generatePublicId(): string {
  return `rp_${publicNano()}`;
}

export function generateScanToken(): string {
  return nanoid(40);
}
