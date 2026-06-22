import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BioEchem",
    template: "%s | BioEchem Portal",
  },
  description:
    "Partner-school portal for BioEchem — STEM education and clean-tech curriculum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex min-h-screen flex-col antialiased">
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
