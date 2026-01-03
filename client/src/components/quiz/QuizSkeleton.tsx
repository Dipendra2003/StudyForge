import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function QuizPlayerSkeleton() {
  return (
    <Card className="w-full max-w-4xl mx-auto glass-card">
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-center">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="text-center">
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4 mt-3">
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full hidden md:block" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
        {/* Question Text */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border p-3 md:p-4 rounded-md">
              <div className="flex items-start">
                <Skeleton className="h-5 w-5 rounded-full mt-1" />
                <div className="ml-3 flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export function QuizConfigurationSkeleton() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Question Count */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Question Types */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="glass-light p-4 rounded-md space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Start Button */}
        <Skeleton className="h-12 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function QuizResultsSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="overflow-hidden glass-card">
        <CardHeader className="text-center pb-4">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-6 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="flex flex-col items-center justify-center py-8">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-light">
                <CardContent className="pt-6 text-center">
                  <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
                  <Skeleton className="h-8 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Accuracy Bar */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </CardFooter>
      </Card>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-md" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded-md" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
