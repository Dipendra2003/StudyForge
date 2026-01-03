import { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";

/**
 * BadgeCollection Component
 * 
 * Displays user's earned badges and progress toward locked badges
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

interface BadgeDefinition {
  type: string;
  name: string;
  description: string;
  unlockCriteria: string;
  icon: React.ReactNode;
  color: string;
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
    color: 'from-yellow-400 to-yellow-600',
    category: 'performance',
  },
  {
    type: 'silver_badge',
    name: 'Silver Badge',
    description: 'Achieved a score between 70% and 89%',
    unlockCriteria: 'Score between 70% and 89% on any quiz',
    icon: <Award className="h-8 w-8" />,
    color: 'from-gray-300 to-gray-500',
    category: 'performance',
  },
  {
    type: 'bronze_badge',
    name: 'Bronze Badge',
    description: 'Achieved a score between 50% and 69%',
    unlockCriteria: 'Score between 50% and 69% on any quiz',
    icon: <Award className="h-8 w-8" />,
    color: 'from-orange-400 to-orange-600',
    category: 'performance',
  },
  {
    type: 'perfect_score',
    name: 'Perfect Score',
    description: 'Achieved 100% accuracy on a quiz',
    unlockCriteria: 'Answer all questions correctly in a single quiz',
    icon: <Target className="h-8 w-8" />,
    color: 'from-green-400 to-green-600',
    category: 'performance',
  },
  {
    type: 'speed_demon',
    name: 'Speed Demon',
    description: 'Completed a quiz with high score in record time',
    unlockCriteria: 'Score above 80% in less than 10 seconds per question',
    icon: <Zap className="h-8 w-8" />,
    color: 'from-purple-400 to-purple-600',
    category: 'performance',
  },
  {
    type: 'category_master',
    name: 'Category Master',
    description: 'Mastered a category with 10+ attempts and 85%+ average score',
    unlockCriteria: 'Complete 10+ quizzes in a category with 85%+ average',
    icon: <BookOpen className="h-8 w-8" />,
    color: 'from-blue-400 to-blue-600',
    category: 'milestone',
  },
  {
    type: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintained a 7-day quiz streak',
    unlockCriteria: 'Complete at least one quiz per day for 7 consecutive days',
    icon: <Flame className="h-8 w-8" />,
    color: 'from-red-400 to-red-600',
    category: 'streak',
  },
  {
    type: 'quiz_marathon',
    name: 'Quiz Marathon',
    description: 'Completed 50+ quizzes',
    unlockCriteria: 'Complete a total of 50 quizzes',
    icon: <Trophy className="h-8 w-8" />,
    color: 'from-indigo-400 to-indigo-600',
    category: 'milestone',
  },
  {
    type: 'improvement_star',
    name: 'Improvement Star',
    description: 'Showed significant improvement over time',
    unlockCriteria: 'Improve your average score by 20% over 10 quizzes',
    icon: <TrendingUp className="h-8 w-8" />,
    color: 'from-pink-400 to-pink-600',
    category: 'milestone',
  },
];

interface BadgeCollectionProps {
  userId?: number;
}

export default function BadgeCollection({ userId }: BadgeCollectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'earned' | 'locked'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      setIsLoading(true);
      const endpoint = userId 
        ? `/api/achievements/user/${userId}` 
        : '/api/achievements';
      
      const response = await apiGet(endpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load achievements. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeDefinition = (type: string): BadgeDefinition | undefined => {
    return BADGE_DEFINITIONS.find(def => def.type === type);
  };

  const isEarned = (badgeType: string): boolean => {
    return achievements.some(ach => ach.badge === badgeType);
  };

  const getEarnedBadge = (badgeType: string): Achievement | undefined => {
    return achievements.find(ach => ach.badge === badgeType);
  };

  const earnedBadges = BADGE_DEFINITIONS.filter(def => isEarned(def.type));
  const lockedBadges = BADGE_DEFINITIONS.filter(def => !isEarned(def.type));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBadgesByCategory = (category: string, badges: BadgeDefinition[]) => {
    return badges.filter(badge => badge.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Badge Collection
          </CardTitle>
          <CardDescription>
            Track your achievements and unlock new badges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-3xl font-bold text-primary">{earnedBadges.length}</div>
              <div className="text-sm text-muted-foreground">Badges Earned</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <div className="text-3xl font-bold text-orange-600">{lockedBadges.length}</div>
              <div className="text-sm text-muted-foreground">Badges Locked</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5">
              <div className="text-3xl font-bold text-green-600">
                {Math.round((earnedBadges.length / BADGE_DEFINITIONS.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Completion</div>
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="mt-6">
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
          </div>
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

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 capitalize flex items-center gap-2">
                  {category === 'performance' && <Target className="h-5 w-5" />}
                  {category === 'milestone' && <Trophy className="h-5 w-5" />}
                  {category === 'streak' && <Flame className="h-5 w-5" />}
                  {category} Badges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryBadges.map((badgeDef) => {
                    const earned = isEarned(badgeDef.type);
                    const earnedBadge = getEarnedBadge(badgeDef.type);

                    return (
                      <BadgeCard
                        key={badgeDef.type}
                        badgeDef={badgeDef}
                        earned={earned}
                        earnedBadge={earnedBadge}
                        onClick={() => setSelectedBadge(badgeDef)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="earned" className="space-y-4 mt-6">
          {earnedBadges.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No badges earned yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete quizzes to start earning badges!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map((badgeDef) => {
                const earnedBadge = getEarnedBadge(badgeDef.type);
                return (
                  <BadgeCard
                    key={badgeDef.type}
                    badgeDef={badgeDef}
                    earned={true}
                    earnedBadge={earnedBadge}
                    onClick={() => setSelectedBadge(badgeDef)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="space-y-4 mt-6">
          {lockedBadges.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-lg font-medium">All badges unlocked!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Congratulations on collecting all available badges!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lockedBadges.map((badgeDef) => (
                <BadgeCard
                  key={badgeDef.type}
                  badgeDef={badgeDef}
                  earned={false}
                  onClick={() => setSelectedBadge(badgeDef)}
                />
              ))}
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <BadgeDetailView
                badgeDef={selectedBadge}
                earned={isEarned(selectedBadge.type)}
                earnedBadge={getEarnedBadge(selectedBadge.type)}
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
  onClick: () => void;
}

function BadgeCard({ badgeDef, earned, earnedBadge, onClick }: BadgeCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`shadow-lg transition-all ${earned ? 'border-primary' : 'opacity-60'}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Badge Icon */}
            <div
              className={`
                w-20 h-20 rounded-full flex items-center justify-center
                bg-gradient-to-br ${badgeDef.color}
                ${earned ? 'shadow-lg' : 'grayscale'}
                relative
              `}
            >
              <div className="text-white">
                {badgeDef.icon}
              </div>
              {!earned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              )}
            </div>

            {/* Badge Name */}
            <div>
              <h4 className="font-semibold text-lg">{badgeDef.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {badgeDef.description}
              </p>
            </div>

            {/* Earned Status */}
            {earned && earnedBadge && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Earned
              </Badge>
            )}
            {!earned && (
              <Badge variant="secondary">
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
  onClose: () => void;
}

function BadgeDetailView({ badgeDef, earned, earnedBadge, onClose }: BadgeDetailViewProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              bg-gradient-to-br ${badgeDef.color}
              ${earned ? 'shadow-lg' : 'grayscale'}
              relative
            `}
          >
            <div className="text-white">
              {badgeDef.icon}
            </div>
            {!earned && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Lock className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">{badgeDef.name}</h3>
            {earned ? (
              <Badge variant="default" className="bg-green-500 mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Earned
              </Badge>
            ) : (
              <Badge variant="secondary" className="mt-1">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icons.close className="h-5 w-5" />
        </button>
      </div>

      {/* Description */}
      <div>
        <h4 className="font-semibold mb-2">Description</h4>
        <p className="text-muted-foreground">{badgeDef.description}</p>
      </div>

      {/* Unlock Criteria */}
      <div>
        <h4 className="font-semibold mb-2">How to Unlock</h4>
        <p className="text-muted-foreground">{badgeDef.unlockCriteria}</p>
      </div>

      {/* Earned Date */}
      {earned && earnedBadge && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Earned on {formatDate(earnedBadge.earnedAt)}</span>
          </div>
        </div>
      )}

      {/* Category */}
      <div className="pt-4 border-t">
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
