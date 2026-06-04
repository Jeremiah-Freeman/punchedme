import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Punched.me — Digital punch cards without the stupid card.",
  description:
    "Replace paper punch cards with Apple Wallet and Google Wallet passes. No app required for customers.",
  icons: { icon: "/favicon.ico" },
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
