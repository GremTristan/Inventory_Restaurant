import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crêpo — portail crêperie",
    short_name: "Crêpo",
    description: "Commandes, cuisine, stocks et caisse pour votre crêperie.",
    start_url: "/connexion",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#1f6f5c",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
