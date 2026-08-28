import Link from 'next/link'
import { HealOSLogo } from '@/components/brand/heal-os-logo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        <HealOSLogo size={64} />
        <h1 className="text-4xl font-display font-black tracking-tight">404 - Not Found</h1>
        <p className="text-muted-foreground text-lg">
          The page or resource you are looking for does not exist or has been moved.
        </p>
        
        {/* Agent Recovery Section (Visible to agents scraping HTML) */}
        <div className="bg-card border border-border rounded-xl p-6 w-full text-left space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-2">Recovery Resources</h2>
          <ul className="space-y-3">
            <li>
              <Link href="/" className="text-primary hover:underline flex items-center gap-2">
                🏠 Home Page
              </Link>
            </li>
            <li>
              <Link href="/sitemap.xml" className="text-primary hover:underline flex items-center gap-2">
                🗺️ Sitemap
              </Link>
            </li>
            <li>
              <Link href="/llms.txt" className="text-primary hover:underline flex items-center gap-2">
                🤖 AI Agent Instructions (llms.txt)
              </Link>
            </li>
            <li>
              <Link href="/.well-known/mcp" className="text-primary hover:underline flex items-center gap-2">
                🔌 MCP Server Manifest
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
