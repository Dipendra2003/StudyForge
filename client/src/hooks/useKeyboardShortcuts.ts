import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onRevealAnswer?: () => void;
  onPreviousCard?: () => void;
  onNextCard?: () => void;
  onMarkIncorrect?: () => void;
  onMarkCorrect?: () => void;
  isAnswerVisible?: boolean;
  isDialogOpen?: boolean;
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts in study mode
 * 
 * Keyboard shortcuts:
 * - Space: Reveal answer
 * - Left Arrow: Previous card
 * - Right Arrow: Next card
 * - 1: Mark incorrect (when answer is visible)
 * - 2: Mark correct (when answer is visible)
 */
export function useKeyboardShortcuts({
  onRevealAnswer,
  onPreviousCard,
  onNextCard,
  onMarkIncorrect,
  onMarkCorrect,
  isAnswerVisible = false,
  isDialogOpen = false,
  enabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    // Don't attach listeners if disabled or dialog is open
    if (!enabled || isDialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          // Spacebar - Reveal answer
          event.preventDefault();
          if (onRevealAnswer && !isAnswerVisible) {
            onRevealAnswer();
          }
          break;

        case 'ArrowLeft':
          // Left arrow - Previous card
          event.preventDefault();
          if (onPreviousCard) {
            onPreviousCard();
          }
          break;

        case 'ArrowRight':
          // Right arrow - Next card
          event.preventDefault();
          if (onNextCard) {
            onNextCard();
          }
          break;

        case '1':
          // 1 key - Mark incorrect (only when answer is visible)
          event.preventDefault();
          if (onMarkIncorrect && isAnswerVisible) {
            onMarkIncorrect();
          }
          break;

        case '2':
          // 2 key - Mark correct (only when answer is visible)
          event.preventDefault();
          if (onMarkCorrect && isAnswerVisible) {
            onMarkCorrect();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onRevealAnswer,
    onPreviousCard,
    onNextCard,
    onMarkIncorrect,
    onMarkCorrect,
    isAnswerVisible,
    isDialogOpen,
    enabled,
  ]);
}
