import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"] });

const SITE_TITLE = "Punched.me — Digital punch cards without the stupid card.";
const SHARE_TITLE = "Digital punch cards without the stupid . . . punch cards";
const SITE_DESC =
  "Replace paper punch cards with Apple Wallet and Google Wallet passes. Customers scan a QR code — no app, no login, no friction.";

export const metadata: Metadata = {
  metadataBase: new URL("https://punched.me"),
  title: SITE_TITLE,
  description: SITE_DESC,
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    url: "https://punched.me",
    siteName: "Punched.me",
    title: SHARE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SITE_DESC,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={raleway.className}>{children}</body>
    </html>
  );
}
