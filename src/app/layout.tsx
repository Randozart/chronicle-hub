import type { Metadata, Viewport } from "next"; // Import Viewport
import { fontVariables } from './fonts'; 
import "@/styles/main.css";
import { Providers } from "./providers";
import { AudioProvider } from "@/providers/AudioProvider";

export const metadata: Metadata = {
  title: "Chronicle Hub",
  description: "Create and play text-based RPGs",
  icons: {
    icon: '/logo.svg', 
  },
};

// ADD THIS EXPORT
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents double-tap to zoom issues in games
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
        <Providers>
          <AudioProvider>
            {children}
          </AudioProvider>
        </Providers>
      </body>
    </html>
  );
}