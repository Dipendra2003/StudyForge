import { useEffect } from 'react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { Question, isMCQData, isTrueFalseData } from '@/../../shared/quiz-types';

interface TTSReaderProps {
  enabled: boolean;
  question: Question;
  readQuestion?: boolean;
  readOptions?: boolean;
  readExplanation?: boolean;
  explanation?: string;
  autoRead?: boolean;
  onReadComplete?: () => void;
}

/**
 * TTSReader component for reading quiz questions, options, and explanations aloud
 * Implements Requirements 16.1, 16.2, 16.3
 */
export function TTSReader({
  enabled,
  question,
  readQuestion = true,
  readOptions = true,
  readExplanation = false,
  explanation,
  autoRead = false,
  onReadComplete,
}: TTSReaderProps) {
  const tts = useTextToSpeech();

  useEffect(() => {
    if (!enabled || !autoRead || !tts.isSupported) {
      return;
    }

    // Build the text to read
    const textParts: string[] = [];

    // Read question
    if (readQuestion && question.question) {
      textParts.push(question.question);
    }

    // Read options based on question type
    if (readOptions) {
      if (question.type === 'mcq' && isMCQData(question.questionData)) {
        textParts.push('The options are:');
        question.questionData.options.forEach((option, index) => {
          textParts.push(`Option ${index + 1}: ${option.text}`);
        });
      } else if (question.type === 'true-false' && isTrueFalseData(question.questionData)) {
        textParts.push('True or False?');
      } else if (question.type === 'fill-blank') {
        textParts.push('Please fill in the blanks.');
      } else if (question.type === 'matching') {
        textParts.push('Match the items from the left column to the right column.');
      } else if (question.type === 'rearrange') {
        textParts.push('Arrange the items in the correct order.');
      }
    }

    // Read explanation
    if (readExplanation && (explanation || question.explanation)) {
      textParts.push('Explanation:');
      textParts.push(explanation || question.explanation);
    }

    // Combine all parts and speak
    const fullText = textParts.join('. ');
    if (fullText) {
      tts.speak(fullText);
    }

    // Cleanup on unmount or when question changes
    return () => {
      tts.stop();
    };
  }, [enabled, autoRead, question, readQuestion, readOptions, readExplanation, explanation, tts]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to manually trigger TTS for specific content
 */
export function useTTSReader() {
  const tts = useTextToSpeech();

  const readQuestion = (question: Question) => {
    if (!tts.isSupported) return;

    const textParts: string[] = [question.question];

    if (question.type === 'mcq' && isMCQData(question.questionData)) {
      textParts.push('The options are:');
      question.questionData.options.forEach((option, index) => {
        textParts.push(`Option ${index + 1}: ${option.text}`);
      });
    } else if (question.type === 'true-false') {
      textParts.push('True or False?');
    }

    tts.speak(textParts.join('. '));
  };

  const readExplanation = (explanation: string) => {
    if (!tts.isSupported) return;
    tts.speak(`Explanation: ${explanation}`);
  };

  const readMotivation = (message: string) => {
    if (!tts.isSupported) return;
    tts.speak(message);
  };

  return {
    readQuestion,
    readExplanation,
    readMotivation,
    ...tts,
  };
}
