import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const newsreader = Newsreader({
  variable: "--font-news",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Memory Lane",
  description: "A personal photo and video slideshow with narration",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
