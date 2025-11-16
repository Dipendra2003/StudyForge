import { useMemo } from "react";

interface MasteryChartProps {
  data: { level: string; count: number }[];
}

export function MasteryChart({ data }: MasteryChartProps) {
  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  const chartData = useMemo(() => {
    if (total === 0) return [];
    
    let currentAngle = -90; // Start from top
    
    return data.map((item) => {
      const percentage = (item.count / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      return {
        ...item,
        percentage: Math.round(percentage),
        startAngle,
        endAngle,
      };
    });
  }, [data, total]);

  // Color mapping for mastery levels
  const getColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'learning':
        return { bg: 'bg-yellow-500', text: 'text-yellow-500', stroke: '#eab308' };
      case 'reviewing':
        return { bg: 'bg-blue-500', text: 'text-blue-500', stroke: '#3b82f6' };
      case 'mastered':
        return { bg: 'bg-green-500', text: 'text-green-500', stroke: '#22c55e' };
      default:
        return { bg: 'bg-gray-500', text: 'text-gray-500', stroke: '#6b7280' };
    }
  };

  // Create SVG path for pie slice
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(100, 100, 80, endAngle);
    const end = polarToCartesian(100, 100, 80, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', 100, 100,
      'L', start.x, start.y,
      'A', 80, 80, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  if (total === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No mastery data available
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pie Chart */}
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          {chartData.map((item, index) => {
            const colors = getColor(item.level);
            return (
              <path
                key={index}
                d={createArc(item.startAngle, item.endAngle)}
                fill={colors.stroke}
                className="transition-opacity hover:opacity-80 cursor-pointer"
              />
            );
          })}
          {/* Center circle for donut effect */}
          <circle cx="100" cy="100" r="50" fill="white" className="dark:fill-gray-900" />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-primary">{total}</div>
          <div className="text-xs text-muted-foreground">Total Cards</div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-3 w-full">
        {chartData.map((item) => {
          const colors = getColor(item.level);
          return (
            <div key={item.level} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${colors.bg}`} />
                <span className="text-sm font-medium">{item.level}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{item.count} cards</span>
                <span className={`text-sm font-semibold ${colors.text}`}>
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
