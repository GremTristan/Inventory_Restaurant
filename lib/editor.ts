// Identity of the company publishing the SaaS, shown on legal pages and
// receipts footer. Configured by environment so the same build serves any
// editor; defaults are visibly placeholders so nothing ships half-filled
// unnoticed.
export const EDITOR = {
  name: process.env.NEXT_PUBLIC_EDITOR_NAME ?? "[Raison sociale de l’éditeur]",
  address: process.env.NEXT_PUBLIC_EDITOR_ADDRESS ?? "[Adresse complète]",
  email: process.env.NEXT_PUBLIC_EDITOR_EMAIL ?? "contact@exemple.ch",
  registration: process.env.NEXT_PUBLIC_EDITOR_REGISTRATION ?? "[N° IDE / RCS]",
  hosting: process.env.NEXT_PUBLIC_EDITOR_HOSTING ?? "Vercel Inc. (application, région Europe — Francfort) et Neon Inc. (base de données, région Europe — Francfort)",
  country: process.env.NEXT_PUBLIC_EDITOR_COUNTRY ?? "Suisse",
  siteUrl: process.env.APP_URL ?? "http://localhost:3000",
};

export const LEGAL_UPDATED = "1er septembre 2026";
