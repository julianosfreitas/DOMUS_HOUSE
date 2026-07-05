import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegister } from '@/components/sw-register';

// Wordmark DOMUS + títulos (display condensada, imponente).
const romario = localFont({
  src: './fonts/Romario-Demo.ttf',
  variable: '--font-romario',
  display: 'swap',
});
// Dingbat de ícones brasileiros (tucano, bandeira, café, carnaval…) usado como
// acento decorativo. `block` evita mostrar a letra crua antes da fonte carregar.
const brasil = localFont({
  src: './fonts/BrasilIcons.otf',
  variable: '--font-brasil',
  display: 'block',
});

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
    <html lang="pt-BR" suppressHydrationWarning className={`${romario.variable} ${brasil.variable}`}>
      {/* suppressHydrationWarning no body: extensões (ColorZilla, Grammarly…) injetam
          atributos como cz-shortcut-listen no <body> antes do React hidratar. */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
