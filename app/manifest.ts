import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jayson Lucian · Personal Trainer",
    short_name: "Jayson Lucian",
    description: "Agenda, treinos e financeiro dos alunos do Jayson Lucian",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#0E0E10",
    theme_color: "#0E0E10",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
