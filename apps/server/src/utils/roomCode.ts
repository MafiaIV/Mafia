import { customAlphabet } from 'nanoid';

// Avoid ambiguous characters (0/O, 1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const generate = customAlphabet(ALPHABET, 6);

export function generateRoomCode(): string {
  return generate();
}
