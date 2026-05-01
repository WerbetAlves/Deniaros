import type { Metadata } from "next";
import "./globals.css";

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
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
