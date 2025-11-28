import type { Metadata } from "next";
import { fontVariables } from './fonts'; // Adjust path if needed
import "./globals.css";
import { Providers } from "./providers";


export const metadata: Metadata = {
  title: "Chronicle Hub",
  description: "Create and play text-based RPGs",
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
            {children}
        </Providers>
      </body>
    </html>
  );
}