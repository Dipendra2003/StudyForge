import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/ui/icons";
import { apiGet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Award, 
  Trophy, 
  Zap, 
  Target, 
  Flame, 
  BookOpen, 
  TrendingUp,
  Lock,
  Calendar,
  CheckCircle2,
  Sparkles,
  Info,
  Crown,
  Compass,
  Moon
} from "lucide-react";

/**
 * BadgeCollection Component
 * 
 * Displays user's earned badges and progress toward locked badges
 * with real data from the achievements API.
 * Requirements: 9.5, 26.3
 */

interface Achievement {
  id: number;
  userId: number;
  type: string;
  name: string;
  description: string;
  badge: string;
  level: number;
  earnedAt: Date;
}

interface BadgeProgressData {
  type: string;
  name: string;
  current: number;
  target: number;
  percentage: number;
  detail: string;
}

interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  unlockCriteria: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  category: 'performance' | 'milestone' | 'streak';
}

// Define all possible badges with their unlock criteria
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: 'gold_badge',
    name: 'Gold Badge',
    description: 'Achieved a score above 90%',
    unlockCriteria: 'Score above 90% on any quiz',
    icon: <Trophy className="h-8 w-8" />,
    color: 'from-yellow-400 to-amber-600',
    glowColor: 'shadow-yellow-400/50',
    category: 'performance',
  },
  {
    type: 'silver_badge',
    name: 'Silver Badge',
    description: 'Achieved a score between 70% and 89%',
    unlockCriteria: 'Score between 70% and 89% on any quiz',
    icon: <Award className="h-8 w-8" />,
    color: 'from-slate-300 to-slate-500',
    glowColor: 'shadow-slate-300/50',
    category: 'performance',
  },
  {
    type: 'bronze_badge',
    name: 'Bronze Badge',
    description: 'Achieved a score between 50% and 69%',
    unlockCriteria: 'Score between 50% and 69% on any quiz',
    icon: <Award className="h-8 w-8" />,
    color: 'from-orange-400 to-orange-600',
    glowColor: 'shadow-orange-400/50',
    category: 'performance',
  },
  {
    type: 'perfect_score',
    name: 'Perfect Score',
    description: 'Achieved 100% accuracy on a quiz',
    unlockCriteria: 'Answer all questions correctly in a single quiz',
    icon: <Target className="h-8 w-8" />,
    color: 'from-emerald-400 to-emerald-600',
    glowColor: 'shadow-emerald-400/50',
    category: 'performance',
  },
  {
    type: 'speed_demon',
    name: 'Speed Demon',
    description: 'Completed a quiz with high score in record time',
    unlockCriteria: 'Score above 80% in less than 10 seconds per question',
    icon: <Zap className="h-8 w-8" />,
    color: 'from-violet-400 to-violet-600',
    glowColor: 'shadow-violet-400/50',
    category: 'performance',
  },
  {
    type: 'category_master',
    name: 'Category Master',
    description: 'Mastered a category with 10+ attempts and 85%+ average score',
    unlockCriteria: 'Complete 10+ quizzes in a category with 85%+ average',
    icon: <BookOpen className="h-8 w-8" />,
    color: 'from-blue-400 to-blue-600',
    glowColor: 'shadow-blue-400/50',
    category: 'milestone',
  },
  {
    type: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintained a 7-day quiz streak',
    unlockCriteria: 'Complete at least one quiz per day for 7 consecutive days',
    icon: <Flame className="h-8 w-8" />,
    color: 'from-red-400 to-red-600',
    glowColor: 'shadow-red-400/50',
    category: 'streak',
  },
  {
    type: 'quiz_marathon',
    name: 'Quiz Marathon',
    description: 'Completed 50+ quizzes',
    unlockCriteria: 'Complete a total of 50 quizzes',
    icon: <Trophy className="h-8 w-8" />,
    color: 'from-indigo-400 to-indigo-600',
    glowColor: 'shadow-indigo-400/50',
    category: 'milestone',
  },
  {
    type: 'improvement_star',
    name: 'Improvement Star',
    description: 'Showed significant improvement over time',
    unlockCriteria: 'Improve your average score by 20% over 10 quizzes',
    icon: <TrendingUp className="h-8 w-8" />,
    color: 'from-pink-400 to-rose-600',
    glowColor: 'shadow-pink-400/50',
    category: 'milestone',
  },
  {
    type: 'flawless_master',
    name: 'Flawless Master',
    description: 'Achieved 100% accuracy on a Hard quiz',
    unlockCriteria: 'Score 100% on a Hard difficulty quiz',
    icon: <Crown className="h-8 w-8" />,
    color: 'from-amber-400 to-yellow-600',
    glowColor: 'shadow-amber-400/50',
    category: 'performance',
  },
  {
    type: 'polymath',
    name: 'Jack of All Trades',
    description: 'Completed quizzes in 5 different categories',
    unlockCriteria: 'Play quizzes in at least 5 distinct categories',
    icon: <Compass className="h-8 w-8" />,
    color: 'from-cyan-400 to-blue-600',
    glowColor: 'shadow-cyan-400/50',
    category: 'milestone',
  },
  {
    type: 'qotd_champion',
    name: 'QOTD Champion',
    description: 'Completed the Quiz of the Day 7 times',
    unlockCriteria: 'Play the Quiz of the Day 7 total times',
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-teal-400 to-emerald-600',
    glowColor: 'shadow-teal-400/50',
    category: 'milestone',
  },
  {
    type: 'night_owl',
    name: 'Night Owl',
    description: 'Completed a quiz between Midnight and 4 AM',
    unlockCriteria: 'Finish any quiz between 12:00 AM and 4:00 AM local time',
    icon: <Moon className="h-8 w-8" />,
    color: 'from-slate-700 to-slate-900',
    glowColor: 'shadow-slate-700/50',
    category: 'performance',
  },
];

interface BadgeCollectionProps {
  userId?: number;
}

export default function BadgeCollection({ userId }: BadgeCollectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progressData, setProgressData] = useState<BadgeProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'locked'>('all');
  const [newlyEarned, setNewlyEarned] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch achievements and progress in parallel
      const achievementEndpoint = userId 
        ? `/api/achievements/user/${userId}` 
        : '/api/achievements';
      
      const [achResponse, progressResponse] = await Promise.all([
        apiGet(achievementEndpoint),
        apiGet('/api/achievements/progress'),
      ]);
      
      if (!achResponse.ok) {
        throw new Error('Failed to fetch achievements');
      }
      
      const achData = await achResponse.json();
      const newAchievements: Achievement[] = achData.achievements || [];
      
      // Detect newly earned badges (compare with previous state)
      if (achievements.length > 0 && newAchievements.length > achievements.length) {
        const previousTypes = new Set(achievements.map(a => a.badge));
        const newTypes = newAchievements
          .filter(a => !previousTypes.has(a.badge))
          .map(a => a.badge);
        
        if (newTypes.length > 0) {
          setNewlyEarned(new Set(newTypes));
          // Clear the "new" indicator after 5 seconds
          setTimeout(() => setNewlyEarned(new Set()), 5000);
          
          toast({
            title: '🎉 New Badge Earned!',
            description: `You just earned ${newTypes.length} new badge${newTypes.length > 1 ? 's' : ''}!`,
          });
        }
      }
      
      setAchievements(newAchievements);
      
      // Parse progress data
      if (progressResponse.ok) {
        const progressResult = await progressResponse.json();
        setProgressData(progressResult.progress || []);
      }
    } catch (error) {

      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load achievements. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast, achievements.length]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const isEarned = (badgeType: string): boolean => {
    return achievements.some(ach => ach.badge === badgeType);
  };

  const getEarnedBadge = (badgeType: string): Achievement | undefined => {
    return achievements.find(ach => ach.badge === badgeType);
  };

  const getProgress = (badgeType: string): BadgeProgressData | undefined => {
    return progressData.find(p => p.type === badgeType);
  };

  const earnedBadges = BADGE_DEFINITIONS.filter(def => isEarned(def.type));
  const lockedBadges = BADGE_DEFINITIONS.filter(def => !isEarned(def.type));

  const getBadgesByCategory = (category: string, badges: BadgeDefinition[]) => {
    return badges.filter(badge => badge.category === category);
  };

  const categoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    performance: { label: 'Performance Badges', icon: <Target className="h-5 w-5" /> },
    milestone: { label: 'Milestone Badges', icon: <Trophy className="h-5 w-5" /> },
    streak: { label: 'Streak Badges', icon: <Flame className="h-5 w-5" /> },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center p-4 rounded-lg bg-muted/50 animate-pulse">
                  <div className="h-8 w-16 bg-muted rounded mx-auto mb-2" />
                  <div className="h-4 w-24 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="h-3 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
        {/* Skeleton Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="shadow-lg animate-pulse">
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-muted" />
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/80 overflow-hidden relative">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary translate-y-1/3 -translate-x-1/4" />
        </div>
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            Badge Collection
          </CardTitle>
          <CardDescription>
            Track your achievements and unlock new badges
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {earnedBadges.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Badges Earned</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/10"
            >
              <div className="text-4xl font-bold text-orange-600">{lockedBadges.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Badges Locked</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-5 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/10"
            >
              <div className="text-4xl font-bold text-green-600">
                {Math.round((earnedBadges.length / BADGE_DEFINITIONS.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Completion</div>
            </motion.div>
          </div>
          
          {/* Overall Progress */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {earnedBadges.length} / {BADGE_DEFINITIONS.length}
              </span>
            </div>
            <Progress 
              value={(earnedBadges.length / BADGE_DEFINITIONS.length) * 100} 
              className="h-3"
            />
          </motion.div>
        </CardContent>
      </Card>

      {/* Badge Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All Badges ({BADGE_DEFINITIONS.length})
          </TabsTrigger>
          <TabsTrigger value="earned">
            Earned ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            Locked ({lockedBadges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-6">
          {['performance', 'milestone', 'streak'].map((category) => {
            const categoryBadges = getBadgesByCategory(category, BADGE_DEFINITIONS);
            if (categoryBadges.length === 0) return null;
            const catInfo = categoryLabels[category];

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {catInfo.icon}
                  {catInfo.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryBadges.map((badgeDef, index) => {
                    const earned = isEarned(badgeDef.type);
                    const earnedBadge = getEarnedBadge(badgeDef.type);
                    const badgeProgress = getProgress(badgeDef.type);

                    return (
                      <motion.div
                        key={badgeDef.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <BadgeCard
                          badgeDef={badgeDef}
                          earned={earned}
                          earnedBadge={earnedBadge}
                          progress={badgeProgress}
                          isNew={newlyEarned.has(badgeDef.type)}
                          onClick={() => setSelectedBadge(badgeDef)}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="earned" className="space-y-4 mt-6">
          {earnedBadges.length === 0 ? (
            <Card className="shadow-lg border-0">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Award className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">No badges earned yet</p>
                <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
                  Complete quizzes to start earning badges! Try scoring above 50% on your first quiz.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map((badgeDef, index) => {
                const earnedBadge = getEarnedBadge(badgeDef.type);
                return (
                  <motion.div
                    key={badgeDef.type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BadgeCard
                      badgeDef={badgeDef}
                      earned={true}
                      earnedBadge={earnedBadge}
                      isNew={newlyEarned.has(badgeDef.type)}
                      onClick={() => setSelectedBadge(badgeDef)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="space-y-4 mt-6">
          {lockedBadges.length === 0 ? (
            <Card className="shadow-lg border-0">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-4 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <p className="text-lg font-medium">All badges unlocked! 🎉</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Congratulations on collecting all available badges!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedBadges.map((badgeDef, index) => {
                const badgeProgress = getProgress(badgeDef.type);
                return (
                  <motion.div
                    key={badgeDef.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BadgeCard
                      badgeDef={badgeDef}
                      earned={false}
                      progress={badgeProgress}
                      onClick={() => setSelectedBadge(badgeDef)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 border"
              onClick={(e) => e.stopPropagation()}
            >
              <BadgeDetailView
                badgeDef={selectedBadge}
                earned={isEarned(selectedBadge.type)}
                earnedBadge={getEarnedBadge(selectedBadge.type)}
                progress={getProgress(selectedBadge.type)}
                onClose={() => setSelectedBadge(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BadgeCardProps {
  badgeDef: BadgeDefinition;
  earned: boolean;
  earnedBadge?: Achievement;
  progress?: BadgeProgressData;
  isNew?: boolean;
  onClick: () => void;
}

function BadgeCard({ badgeDef, earned, earnedBadge, progress, isNew, onClick }: BadgeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`
        shadow-lg transition-all duration-300 border-0 overflow-hidden relative
        ${earned 
          ? `ring-2 ring-primary/30 ${isNew ? 'ring-primary animate-pulse' : ''}` 
          : 'opacity-80 hover:opacity-100'
        }
      `}>
        {/* Earned glow effect */}
        {earned && (
          <div className={`absolute inset-0 bg-gradient-to-br ${badgeDef.color} opacity-5`} />
        )}
        
        {/* New badge indicator */}
        {isNew && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-0 shadow-lg animate-bounce">
              <Sparkles className="h-3 w-3 mr-1" />
              NEW!
            </Badge>
          </div>
        )}

        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Badge Icon */}
            <motion.div
              className={`
                w-20 h-20 rounded-full flex items-center justify-center
                bg-gradient-to-br ${badgeDef.color}
                ${earned ? `shadow-lg ${badgeDef.glowColor}` : 'grayscale'}
                relative
              `}
              animate={isNew ? { 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              } : {}}
              transition={{ duration: 0.6, repeat: isNew ? 3 : 0 }}
            >
              <div className="text-white">
                {badgeDef.icon}
              </div>
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Lock className="h-6 w-6 text-white/80" />
                </div>
              )}
            </motion.div>

            {/* Badge Name */}
            <div>
              <h4 className="font-semibold text-base">{badgeDef.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {badgeDef.description}
              </p>
            </div>

            {/* Earned Status */}
            {earned && earnedBadge && (
              <Badge variant="default" className="bg-green-500/90 hover:bg-green-500 border-0 shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Earned
              </Badge>
            )}

            {/* Locked with progress */}
            {!earned && progress && (
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="secondary" className="border-0 text-xs px-2 py-0.5">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                  <span className="text-muted-foreground font-medium">
                    {progress.percentage}%
                  </span>
                </div>
                <Progress value={progress.percentage} className="h-1.5" />
              </div>
            )}

            {!earned && !progress && (
              <Badge variant="secondary" className="border-0">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface BadgeDetailViewProps {
  badgeDef: BadgeDefinition;
  earned: boolean;
  earnedBadge?: Achievement;
  progress?: BadgeProgressData;
  onClose: () => void;
}

function BadgeDetailView({ badgeDef, earned, earnedBadge, progress, onClose }: BadgeDetailViewProps) {
  const formatDate = (date: Date) => {
    // Convert to local timezone for display
    const localDate = new Date(date);
    return localDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              bg-gradient-to-br ${badgeDef.color}
              ${earned ? `shadow-lg ${badgeDef.glowColor}` : 'grayscale'}
              relative
            `}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <div className="text-white">
              {badgeDef.icon}
            </div>
            {!earned && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Lock className="h-5 w-5 text-white/80" />
              </div>
            )}
          </motion.div>
          <div>
            <h3 className="text-xl font-bold">{badgeDef.name}</h3>
            {earned ? (
              <Badge variant="default" className="bg-green-500/90 hover:bg-green-500 border-0 mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Earned
              </Badge>
            ) : (
              <Badge variant="secondary" className="mt-1 border-0">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
        >
          <Icons.close className="h-5 w-5" />
        </button>
      </div>

      {/* Description */}
      <div className="p-4 rounded-xl bg-muted/50">
        <h4 className="font-semibold mb-1.5 text-sm flex items-center gap-1.5">
          <Info className="h-4 w-4 text-muted-foreground" />
          Description
        </h4>
        <p className="text-sm text-muted-foreground">{badgeDef.description}</p>
      </div>

      {/* Unlock Criteria */}
      <div className="p-4 rounded-xl bg-muted/50">
        <h4 className="font-semibold mb-1.5 text-sm flex items-center gap-1.5">
          <Target className="h-4 w-4 text-muted-foreground" />
          How to Unlock
        </h4>
        <p className="text-sm text-muted-foreground">{badgeDef.unlockCriteria}</p>
      </div>

      {/* Progress (for locked badges) */}
      {!earned && progress && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Your Progress
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{progress.detail}</span>
              <span className="font-bold text-primary">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2.5" />
          </div>
        </div>
      )}

      {/* Earned Date */}
      {earned && earnedBadge && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Earned on {formatDate(earnedBadge.earnedAt)}</span>
          </div>
        </div>
      )}

      {/* Category */}
      <div className="pt-3 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Category:</span>
          <Badge variant="outline" className="capitalize">
            {badgeDef.category}
          </Badge>
        </div>
      </div>
    </div>
  );
}
