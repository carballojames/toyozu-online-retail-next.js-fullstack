import "./globals.css";
import React from "react";
import { Montserrat } from "next/font/google";

export const metadata = {
  title: "Toyozu",
  description: "Toyozu online retail",
};

// Load Montserrat with useful weights and a CSS variable we can use in Tailwind
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.className} root `}>
      <body className="bg-primary-foreground text-foreground min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}