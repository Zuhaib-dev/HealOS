import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/admin/', '/doctor/', '/patient/', '/nurse/', '/reception/', '/pharmacy/', '/radiology/', '/lab/'],
    },
    sitemap: 'https://heal-os-client.vercel.app/sitemap.xml',
  }
}
