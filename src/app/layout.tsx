import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import ClerkProviderWrapper from "@/components/providers/ClerkProviderWrapper";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareBridge",
  description: "Comprehensive Hospital Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProviderWrapper>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}