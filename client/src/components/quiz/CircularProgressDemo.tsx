import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CircularProgress } from "@/components/ui/circular-progress";
import { CircularScoreTracker } from "./CircularScoreTracker";
import { CircularQuizProgress } from "./CircularQuizProgress";

/**
 * Demo component showcasing all circular progress indicator variations
 * This component demonstrates the different circular progress components
 * available in the quiz system with smooth animations and transitions.
 */
export function CircularProgressDemo() {
  const [score, setScore] = useState(75);
  const [currentQuestion, setCurrentQuestion] = useState(5);
  const totalQuestions = 10;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Circular Progress Indicators</h1>
        <p className="text-muted-foreground">
          Interactive demo of animated circular progress components
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>Adjust values to see animations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Score: {score}%
            </label>
            <Slider
              value={[score]}
              onValueChange={(value) => setScore(value[0])}
              min={0}
              max={100}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Current Question: {currentQuestion} / {totalQuestions}
            </label>
            <Slider
              value={[currentQuestion]}
              onValueChange={(value) => setCurrentQuestion(value[0])}
              min={1}
              max={totalQuestions}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic CircularProgress */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Circular Progress</CardTitle>
          <CardDescription>
            Simple circular progress with customizable size and colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-8 justify-center">
            <CircularProgress
              value={score}
              size={100}
              strokeWidth={8}
              animate={true}
              animationDuration={1}
            />
            <CircularProgress
              value={score}
              size={120}
              strokeWidth={10}
              animate={true}
              animationDuration={1}
              indicatorClassName="text-green-500"
            />
            <CircularProgress
              value={score}
              size={140}
              strokeWidth={12}
              animate={true}
              animationDuration={1}
              indicatorClassName="text-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* CircularScoreTracker */}
      <Card>
        <CardHeader>
          <CardTitle>Circular Score Tracker</CardTitle>
          <CardDescription>
            Enhanced score display with icons and color-coded performance levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-8 justify-center">
            <CircularScoreTracker
              score={95}
              size={140}
              strokeWidth={12}
              showIcon={true}
              showLabel={true}
              label="Excellent"
              animate={true}
            />
            <CircularScoreTracker
              score={75}
              size={140}
              strokeWidth={12}
              showIcon={true}
              showLabel={true}
              label="Good"
              animate={true}
            />
            <CircularScoreTracker
              score={55}
              size={140}
              strokeWidth={12}
              showIcon={true}
              showLabel={true}
              label="Fair"
              animate={true}
            />
            <CircularScoreTracker
              score={35}
              size={140}
              strokeWidth={12}
              showIcon={true}
              showLabel={true}
              label="Needs Work"
              animate={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* CircularQuizProgress */}
      <Card>
        <CardHeader>
          <CardTitle>Circular Quiz Progress</CardTitle>
          <CardDescription>
            Track quiz completion with question numbers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-8 justify-center items-center">
            <div className="text-center space-y-2">
              <CircularQuizProgress
                currentQuestion={1}
                totalQuestions={10}
                size={80}
                strokeWidth={6}
                animate={true}
              />
              <p className="text-sm text-muted-foreground">Start</p>
            </div>
            <div className="text-center space-y-2">
              <CircularQuizProgress
                currentQuestion={currentQuestion}
                totalQuestions={totalQuestions}
                size={100}
                strokeWidth={8}
                animate={true}
              />
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center space-y-2">
              <CircularQuizProgress
                currentQuestion={10}
                totalQuestions={10}
                size={80}
                strokeWidth={6}
                animate={true}
              />
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Live Interactive Demo</CardTitle>
          <CardDescription>
            See how the components respond to your controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              key={score}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <CircularScoreTracker
                score={score}
                size={160}
                strokeWidth={14}
                showIcon={true}
                showLabel={true}
                label="Your Score"
                animate={true}
                animationDuration={1.2}
              />
            </motion.div>

            <motion.div
              key={currentQuestion}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <CircularQuizProgress
                currentQuestion={currentQuestion}
                totalQuestions={totalQuestions}
                size={120}
                strokeWidth={10}
                showQuestionNumbers={true}
                animate={true}
                animationDuration={0.8}
              />
              <p className="text-sm text-muted-foreground">Quiz Progress</p>
            </motion.div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <CircularProgress
                value={(currentQuestion / totalQuestions) * 100}
                size={120}
                strokeWidth={10}
                animate={true}
                animationDuration={0.8}
                indicatorClassName="text-blue-500"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Math.round((currentQuestion / totalQuestions) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </CircularProgress>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Animation Showcase</CardTitle>
          <CardDescription>
            Click to trigger smooth animation transitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => setScore(Math.floor(Math.random() * 100))}
              variant="outline"
            >
              Random Score
            </Button>
            <Button
              onClick={() => setCurrentQuestion(Math.floor(Math.random() * totalQuestions) + 1)}
              variant="outline"
            >
              Random Question
            </Button>
            <Button
              onClick={() => {
                setScore(100);
                setCurrentQuestion(totalQuestions);
              }}
              variant="default"
            >
              Complete Quiz
            </Button>
            <Button
              onClick={() => {
                setScore(0);
                setCurrentQuestion(1);
              }}
              variant="secondary"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
