import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AFTERFRAME — Stories beyond the screen", description: "A cinematic home for your films and series." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
