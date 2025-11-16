import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReviewHeatmapProps {
  data: { date: string; count: number }[];
}

export function ReviewHeatmap({ data }: ReviewHeatmapProps) {
  // Group data by weeks for display
  const weeks = useMemo(() => {
    const weekGroups: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];
    
    // Pad the beginning to start on Sunday
    const firstDate = new Date(data[0]?.date);
    const firstDayOfWeek = firstDate.getDay();
    
    // Add empty cells for days before the first date
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0 });
    }
    
    data.forEach((item, index) => {
      currentWeek.push(item);
      
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      
      // If it's Saturday or the last item, start a new week
      if (dayOfWeek === 6 || index === data.length - 1) {
        weekGroups.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weekGroups;
  }, [data]);

  // Get color intensity based on count
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700';
    if (count <= 10) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-300';
  };

  // Format date for tooltip
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pr-2">
            {dayLabels.map((day, index) => (
              <div 
                key={day} 
                className="h-3 text-xs text-gray-500 flex items-center"
                style={{ visibility: index % 2 === 0 ? 'visible' : 'hidden' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <TooltipProvider>
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={`${weekIndex}-${dayIndex}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-3 w-3 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-primary ${
                            day.date ? getColor(day.count) : 'bg-transparent'
                          }`}
                        />
                      </TooltipTrigger>
                      {day.date && (
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-semibold">{formatDate(day.date)}</div>
                            <div className="text-muted-foreground">
                              {day.count} {day.count === 1 ? 'review' : 'reviews'}
                            </div>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="h-3 w-3 rounded-sm bg-green-600 dark:bg-green-500" />
            <div className="h-3 w-3 rounded-sm bg-green-800 dark:bg-green-300" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
