import type { Metadata } from "next";
import { fontVariables } from './fonts'; // Adjust path if needed
import "./globals.css";
import { Providers } from "./providers";
import { AudioProvider } from "@/providers/AudioProvider";


export const metadata: Metadata = {
  title: "Chronicle Hub",
  description: "Create and play text-based RPGs",
  icons: {
    icon: '/logo.svg', // Path relative to the 'public' folder
    // You can also add an apple touch icon if you have one
    // apple: '/images/apple-icon.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <Providers>
          <AudioProvider>
            {children}
          </AudioProvider>
        </Providers>
      </body>
    </html>
  );
}