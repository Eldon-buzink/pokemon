import Link from 'next/link'

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              Pokémon Analysis
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/analysis" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Analysis
              </Link>
              <Link 
                href="/about" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Last updated: Never
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
