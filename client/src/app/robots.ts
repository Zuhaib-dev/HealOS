import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/doctor/', '/patient/', '/nurse/', '/pharmacist/', '/lab/', '/reception/', '/radiology/', '/emergency/'],
    },
    sitemap: 'https://healos-theta.vercel.app/sitemap.xml',
  }
}
