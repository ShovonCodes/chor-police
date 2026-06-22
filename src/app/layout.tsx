import type { Metadata, Viewport } from "next";
import { Baloo_2, Hind_Siliguri } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["latin", "bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chor Police",
  description:
    "Raja Mantri Chor Sipahi — the classic 4-player guessing game, now online. Make a private room, share the code, and find out: Mera Mantri kaun hai?",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d3b2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${hind.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full w-full max-w-full flex flex-col overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
