import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FirebaseProvider } from "@/components/FirebaseProvider";
import { FinanceProvider } from "@/context/FinanceContext";
import { InactivityHandler } from "@/components/InactivityHandler";
import { Toaster } from "sonner";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "FinancePro",
  description: "Gestão Financeira Pessoal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans`}>
        <FirebaseProvider>
          <FinanceProvider>
            <InactivityHandler />
            {children}
            <Toaster position="top-right" richColors />
          </FinanceProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
