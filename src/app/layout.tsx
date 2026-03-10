import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const siteDescription =
  "ThinkDraft – Think it. Draft it. Generate polished essays from images with AI-powered writing assistance and translation";

export const metadata: Metadata = {
  title: "ThinkDraft",
  description: siteDescription,
  openGraph: {
    title: "ThinkDraft",
    description: siteDescription,
    type: "website",
    siteName: "ThinkDraft",
  },
  twitter: {
    card: "summary",
    title: "ThinkDraft",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
        <ToastProvider>
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-56px)] pb-16 sm:min-h-[calc(100vh-64px)] sm:pb-0" tabIndex={-1}>
            {children}
          </main>
        </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
