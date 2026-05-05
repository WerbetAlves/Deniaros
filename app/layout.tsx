import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant"
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  title: "Deniaros",
  description: "Sistema financeiro com clareza, previsão e classe.",
  icons: {
    icon: "/brand/logo-icone-isolado.png",
    shortcut: "/brand/logo-icone-isolado.png",
    apple: "/brand/logo-icone-isolado.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${cormorant.variable} ${manrope.variable}`} data-scroll-behavior="smooth" lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
