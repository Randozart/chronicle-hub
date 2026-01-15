// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { fontVariables } from './fonts'; 
import "@/styles/main.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "Chronicle Hub",
  description: "Create and play text-based RPGs",
  icons: {
    icon: [
      { url: '/logo.svg', media: '(prefers-color-scheme: light)' },
      { url: '/logo-w.svg', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/logo.svg', 
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}