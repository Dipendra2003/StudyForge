interface CategoryChartProps {
  data: { category: string; accuracy: number; total: number }[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  // Sort by total reviews descending
  const sortedData = [...data].sort((a, b) => b.total - a.total);
  
  // Get max value for scaling
  const maxAccuracy = 100;

  return (
    <div className="space-y-4">
      {sortedData.map((item) => (
        <div key={item.category} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium capitalize">{item.category}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.total} reviews</span>
              <span className="font-semibold text-primary">{item.accuracy}%</span>
            </div>
          </div>
          <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
              style={{ width: `${(item.accuracy / maxAccuracy) * 100}%` }}
            >
              {item.accuracy > 15 && (
                <span className="text-xs font-semibold text-white">
                  {item.accuracy}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {sortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No category data available
        </div>
      )}
    </div>
  );
}
