import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AdTestLab',
  description: 'Decision tool for Shopify Meta ad tests',
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var c=t||'dark';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(c);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-text antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
