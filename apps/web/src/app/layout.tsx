import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegister } from '@/components/sw-register';

export const metadata: Metadata = {
  title: 'DOMUS — Casa Inteligente',
  description: 'Controle sua casa por voz, em português, 100% na rede local.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'DOMUS', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
