import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Clock, Target, Users, Crown, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading Leaderboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
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

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-100 to-amber-50 border-yellow-300 dark:from-yellow-900/40 dark:to-amber-900/20 dark:border-yellow-600/50 shadow-yellow-200/50";
      case 2:
        return "from-slate-100 to-gray-50 border-slate-300 dark:from-slate-800/40 dark:to-gray-800/20 dark:border-slate-600/50 shadow-slate-200/50";
      case 3:
        return "from-orange-100 to-rose-50 border-orange-300 dark:from-orange-900/40 dark:to-rose-900/20 dark:border-orange-600/50 shadow-orange-200/50";
      default:
        return "bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-sm" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 drop-shadow-sm" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-500 drop-shadow-sm" />;
    return <span className="font-bold text-gray-500">#{rank}</span>;
  };

  const getAvatarColor = (username: string) => {
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-emerald-500", 
      "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-cyan-500"
    ];
    const index = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-2"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
          Global Leaderboard
        </h2>
        <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm">
          <Users className="w-4 h-4" />
          <span>{totalParticipants + 1} Challengers</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {allParticipants.map((participant, index) => {
          const isTopThree = participant.rank <= 3;
          return (
            <motion.div
              variants={itemVariants}
              key={participant.userId}
              className={`relative overflow-hidden p-5 rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 ${getRankStyle(participant.rank)} ${
                participant.rank === 1 ? 'scale-[1.02] shadow-xl z-10 py-7' : 'hover:-translate-y-1 hover:shadow-lg'
              }`}
            >
              {/* Gold Shimmer Effect for 1st Place */}
              {participant.rank === 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                
                {/* Left: Rank, Avatar, User Info */}
                <div className="flex items-center gap-5 w-full sm:w-auto">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isTopThree ? 'bg-white/60 dark:bg-black/20 shadow-inner' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    {getRankIcon(participant.rank)}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Avatar className={`w-12 h-12 border-2 ${participant.rank === 1 ? 'border-yellow-400' : 'border-transparent shadow-sm'}`}>
                      <AvatarFallback className={`${getAvatarColor(participant.username)} text-white font-bold text-lg`}>
                        {participant.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-lg ${participant.rank === 1 ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                          {participant.username}
                        </span>
                        {participant.userId === creator.userId && (
                          <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800/50">
                            Creator
                          </span>
                        )}
                      </div>
                      {participant.completedAt && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {new Date(participant.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Stats Pills */}
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                  {/* Score */}
                  <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[80px] ${
                    isTopThree ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-100/80 dark:bg-gray-800/80'
                  }`}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> Score
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {participant.score}
                    </span>
                  </div>

                  {/* Accuracy */}
                  <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[80px] ${
                    isTopThree ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-100/80 dark:bg-gray-800/80'
                  }`}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Acc
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {participant.accuracy}%
                    </span>
                  </div>

                  {/* Time */}
                  <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[80px] ${
                    isTopThree ? 'bg-white/50 dark:bg-black/20' : 'bg-gray-100/80 dark:bg-gray-800/80'
                  }`}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Time
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatTime(participant.timeSpent)}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {totalParticipants === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 px-4 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
        >
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">It's quiet here...</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            You're the only one on this leaderboard. Share the link with your friends to start a challenge!
          </p>
        </motion.div>
      )}

      {/* Custom Shimmer Animation in Tailwind (Added via arbitrary value or global css, here handled by style tag for simplicity if needed, but standard tailwind handles basic shimmer if defined. We'll add a style tag to ensure it works) */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
