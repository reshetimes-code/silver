import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Assistant } from "next/font/google";
import "./globals.css";
import AccessibilityWidget from "@/components/ui/AccessibilityWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["latin", "hebrew"],
  weight: ["400", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "PHOTOBOOTH | Capture. Print. Share.",
  description: "Premium photo booth experience with custom overlays and instant printing",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PHOTOBOOTH",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${assistant.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo_transperent.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){function s(){document.documentElement.style.setProperty('--vh',window.innerHeight/100+'px')}
          s();window.addEventListener('resize',s);window.addEventListener('orientationchange',function(){setTimeout(s,150)})})();
        `}} />
      </head>
      <body className="min-h-dvh bg-party overscroll-none">
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
