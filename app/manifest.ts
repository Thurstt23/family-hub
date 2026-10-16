import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Martin Sawyer Reunion',
    short_name: 'Martin Sawyer',
    description: 'Six branches. Four generations. One register.',
    start_url: '/hub',
    scope: '/',
    display: 'standalone',
    background_color: '#EFF1EE',
    theme_color: '#10233A',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
