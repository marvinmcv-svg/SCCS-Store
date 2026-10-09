import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SCCS Store · Santa Cruz Cooperative School',
    short_name: 'SCCS Store',
    description: 'Uniformes, mochilas y recuerdos oficiales de SCCS, con recojo en el colegio.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'es',
    categories: ['shopping', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Tienda', url: '/shop', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Mi bolsa', url: '/bag', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Mis pedidos', url: '/profile/orders', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
