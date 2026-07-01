/** @type {import('next').NextConfig} */
// Alvo do hub para o proxy same-origin (dev/túnel). Sobrescreva com API_PROXY_TARGET.
const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

const nextConfig = {
  reactStrictMode: true,
  // Build enxuto para o container Docker (CasaOS).
  output: 'standalone',
  // Proxy same-origin: o navegador (inclusive celular via LAN/túnel HTTPS) fala só
  // com o web; `/api` e `/socket.io` são repassados ao hub no servidor — sem CORS,
  // sem mixed-content, sem depender de o celular alcançar :4000 diretamente.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_TARGET}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${API_TARGET}/socket.io/:path*` },
    ];
  },
  // Headers básicos de segurança para o dashboard.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
