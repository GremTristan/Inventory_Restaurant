import "server-only";

import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, ROUNDS);
}

export async function verifySecret(secret: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(secret, hash);
}

// Directors protect revenue and staff data: 10+ chars with letters and digits.
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir des lettres et des chiffres.";
  }
  return null;
}

export const PIN_LENGTH = 4;

// Staff PINs: exactly 4 digits (the pad auto-submits on the 4th), no
// trivial sequences. Brute force is bounded by the 5-attempt lock.
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Le code doit contenir exactement 4 chiffres.";
  if (/^(\d)\1+$/.test(pin)) return "Choisissez un code moins évident.";
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) return "Choisissez un code moins évident.";
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
