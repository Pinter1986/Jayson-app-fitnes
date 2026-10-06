import type { Metadata, Viewport } from "next";
import { DM_Sans, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import RegistrarSW from "@/components/RegistrarSW";
import SessaoSupabase from "@/components/SessaoSupabase";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["600", "800"], style: ["normal", "italic"], variable: "--font-poppins" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: { default: "Jayson Lucian · Personal Trainer", template: "%s · Jayson Lucian" },
  description: "Treino sério, clima leve. Aulas presenciais e consultoria online com Jayson Lucian (CREF 018556-G/SC).",
  appleWebApp: { capable: true, title: "Jayson Lucian", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0E0E10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get("tema")?.value === "claro" ? "light" : "dark";
  return (
    <html lang="pt-BR" data-theme={tema} className={`${poppins.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <RegistrarSW />
        <SessaoSupabase />
      </body>
    </html>
  );
}
