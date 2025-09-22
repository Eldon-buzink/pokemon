export default function AnalysisLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Card Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Loading card data and price analysis...
          </p>
        </div>
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Fetching latest card prices and market data...</p>
        </div>
      </div>
    </div>
  )
}
