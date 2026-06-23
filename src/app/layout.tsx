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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000";

const description =
  "A real-time, 4-player web remake of the Bangladeshi party game Chor Police — Babu, Police, Dakat, Chor. Spin up a private room, share the code, and see if the Police can catch the thief. No signup.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Chor Police — পুলিশ, চোর ধরো!",
  description,
  applicationName: "Chor Police",
  openGraph: {
    title: "Chor Police",
    description,
    siteName: "Chor Police",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chor Police",
    description,
  },
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
