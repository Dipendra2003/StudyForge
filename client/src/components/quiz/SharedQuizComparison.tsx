import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Clock, Target, Users, Crown } from "lucide-react";

interface SharedQuizComparisonProps {
  linkId: string;
}

interface Participant {
  userId: number;
  username: string;
  score: number;
  accuracy: number;
  timeSpent: number;
  completedAt?: Date;
  rank: number;
}

interface ComparisonData {
  creator: Participant;
  participants: Participant[];
  totalParticipants: number;
}

export function SharedQuizComparison({ linkId }: SharedQuizComparisonProps) {
  const { data, isLoading, error } = useQuery<{ data: ComparisonData }>({
    queryKey: ["shared-quiz-comparison", linkId],
    queryFn: async () => {
      const response = await fetch(`/api/quiz/share/${linkId}/comparison`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch comparison data");
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Failed to load comparison data
        </p>
      </div>
    );
  }

  const { creator, participants, totalParticipants } = data.data;
  const allParticipants = [creator, ...participants].sort((a, b) => a.rank - b.rank);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-orange-600";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-600" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Quiz Leaderboard
        </h2>
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
          <Users className="w-5 h-5" />
          <span>{totalParticipants + 1} participants</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {allParticipants.map((participant, index) => (
          <motion.div
            key={participant.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-xl border-2 ${
              participant.rank === 1
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                : participant.rank === 2
                ? "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                : participant.rank === 3
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Left: Rank and User */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10">
                  {getRankIcon(participant.rank) || (
                    <span className={`text-lg font-bold ${getRankColor(participant.rank)}`}>
                      #{participant.rank}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {participant.username}
                    </span>
                    {participant.userId === creator.userId && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                        Creator
                      </span>
                    )}
                  </div>
                  {participant.completedAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(participant.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Score</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {participant.score}
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">Accuracy</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {participant.accuracy}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Time</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatTime(participant.timeSpent)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {totalParticipants === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No one has taken this quiz yet.</p>
          <p className="text-sm">Share the link to challenge your friends!</p>
        </div>
      )}
    </div>
  );
}
