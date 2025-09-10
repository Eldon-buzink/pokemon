interface CardDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id: _id } = await params

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <nav className="text-sm text-muted-foreground mb-4">
            <a href="/movers" className="hover:text-foreground">Movers</a> / Card Details
          </nav>
          
          <div className="flex items-start gap-6">
            {/* Card Image */}
            <div className="flex-shrink-0">
              <div className="w-64 h-80 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Card Image</span>
              </div>
            </div>
            
            {/* Card Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Card Name
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Set Name • #123
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">5-Day Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Raw Δ5d:</span>
                      <span className="font-mono text-sm">+12.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">PSA 10 Δ5d:</span>
                      <span className="font-mono text-sm text-green-600">+8.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Spread after fees:</span>
                      <span className="font-mono text-sm">$45.20</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">PSA 10 Probability</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Lifetime:</span>
                      <span className="font-mono text-sm">15.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Rolling (90d):</span>
                      <span className="font-mono text-sm">18.7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Adjusted:</span>
                      <span className="font-mono text-sm">16.1%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  High Confidence
                </span>
                <span className="text-sm text-muted-foreground">
                  Based on 12 sales in 5 days
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Charts Section */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Price Trends</h3>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Price Chart (Recharts)</span>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Population Trends</h3>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Population Chart (Recharts)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
