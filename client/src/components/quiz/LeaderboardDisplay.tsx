import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Award, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LeaderboardDisplay Component
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.5
 * 
 * Displays leaderboard rankings with:
 * - Global leaderboard with top 10 performers (7.1)
 * - Category and difficulty filters (7.2)
 * - Current user position highlighting (7.4)
 * - Pagination for more entries (7.5)
 * - Rank, username, score, and time columns (7.1)
 */

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number;
  timeSpent: number;
  accuracy?: number;
  badge?: string;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  total: number;
  category?: string;
  difficulty?: string;
}

type LeaderboardType = 'global' | 'category' | 'difficulty';

const CATEGORIES = [
  'Tech',
  'Science',
  'General Knowledge',
  'Coding',
  'Math',
  'History',
  'Literature',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const ITEMS_PER_PAGE = 10;

export function LeaderboardDisplay() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tech');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [currentPage, setCurrentPage] = useState(0);

  // Build API endpoint based on type and filters
  const getEndpoint = () => {
    const offset = currentPage * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;
    
    if (leaderboardType === 'global') {
      return `/api/leaderboard/global?limit=${limit}&offset=${offset}`;
    } else if (leaderboardType === 'category') {
      return `/api/leaderboard/category/${selectedCategory}?limit=${limit}&offset=${offset}`;
    } else {
      return `/api/leaderboard/difficulty/${selectedDifficulty}?limit=${limit}&offset=${offset}`;
    }
  };

  const { data, isLoading, error } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', leaderboardType, selectedCategory, selectedDifficulty, currentPage],
    queryFn: async () => {
      return await apiRequest<LeaderboardResponse>(getEndpoint());
    },
  });

  // Reset to first page when changing filters
  const handleTypeChange = (type: LeaderboardType) => {
    setLeaderboardType(type);
    setCurrentPage(0);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(0);
  };

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (data && (currentPage + 1) * ITEMS_PER_PAGE < data.total) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'gold':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'silver':
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 'bronze':
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'gold':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'silver':
        return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
      case 'bronze':
        return 'bg-amber-600/10 text-amber-600 border-amber-600/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Crown className="h-5 w-5 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="h-5 w-5 text-gray-400" />;
    } else if (rank === 3) {
      return <Award className="h-5 w-5 text-amber-600" />;
    }
    return null;
  };

  return (
    <Card className="w-full glass-card" role="region" aria-label="Leaderboard">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Top performers across all quizzes
            </CardDescription>
          </div>
        </div>

        {/* Filters - Requirements 7.2 */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">View</label>
            <Select value={leaderboardType} onValueChange={(value) => handleTypeChange(value as LeaderboardType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="difficulty">By Difficulty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {leaderboardType === 'category' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {leaderboardType === 'difficulty' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <Select value={selectedDifficulty} onValueChange={handleDifficultyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load leaderboard</p>
          </div>
        )}

        {data && data.leaderboard.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold">No Rankings Yet</h3>
            <p className="text-gray-500">Be the first to complete a quiz and claim the top spot!</p>
          </div>
        )}

        {data && data.leaderboard.length > 0 && (
          <>
            {/* Leaderboard Table - Requirements 7.1, 7.4 */}
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Leaderboard rankings">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Player</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Score</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Time</th>
                    {data.leaderboard.some(e => e.accuracy !== undefined) && (
                      <th className="text-right py-3 px-4 font-semibold text-sm">Accuracy</th>
                    )}
                    <th className="text-center py-3 px-4 font-semibold text-sm">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/50",
                        entry.isCurrentUser && "bg-primary/5 border-primary/20"
                      )}
                      role="row"
                      aria-label={entry.isCurrentUser ? "Your ranking" : undefined}
                    >
                      {/* Rank Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(entry.rank)}
                          <span className={cn(
                            "font-semibold",
                            entry.rank <= 3 && "text-lg"
                          )}>
                            #{entry.rank}
                          </span>
                        </div>
                      </td>

                      {/* Username Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            entry.isCurrentUser && "text-primary font-bold"
                          )}>
                            {entry.username}
                          </span>
                          {entry.isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Score Column */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-lg">
                          {entry.score}%
                        </span>
                      </td>

                      {/* Time Column */}
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                        {formatTime(entry.timeSpent)}
                      </td>

                      {/* Accuracy Column (if available) */}
                      {entry.accuracy !== undefined && (
                        <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                          {entry.accuracy}%
                        </td>
                      )}

                      {/* Badge Column */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          {entry.badge && (
                            <Badge
                              variant="outline"
                              className={cn("flex items-center gap-1", getBadgeColor(entry.badge))}
                            >
                              {getBadgeIcon(entry.badge)}
                              <span className="capitalize">{entry.badge}</span>
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* User Rank Display (if not in top results) - Requirement 7.4 */}
            {data.userRank && data.userRank > (currentPage + 1) * ITEMS_PER_PAGE && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-center">
                  <span className="font-semibold">Your Rank:</span> #{data.userRank}
                </p>
              </div>
            )}

            {/* Pagination - Requirement 7.5 */}
            {data.total > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {currentPage * ITEMS_PER_PAGE + 1} - {Math.min((currentPage + 1) * ITEMS_PER_PAGE, data.total)} of {data.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={(currentPage + 1) * ITEMS_PER_PAGE >= data.total}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
