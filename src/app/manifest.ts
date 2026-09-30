import type { MetadataRoute } from 'next';
import { APP_NAME, APP_DESCRIPTION } from '@/config/app';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: APP_NAME, short_name: APP_NAME, description: APP_DESCRIPTION,
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#061419', theme_color: '#061419',
    lang: 'en', categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
