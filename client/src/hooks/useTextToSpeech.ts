import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  voice?: SpeechSynthesisVoice;
}

export interface TTSControls {
  speak: (text: string, options?: TTSOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  currentText: string | null;
}

/**
 * Custom hook for text-to-speech functionality
 * Provides comprehensive TTS controls with pause, resume, skip, and stop
 */
export function useTextToSpeech(): TTSControls {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentText, setCurrentText] = useState<string | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  
  const { toast } = useToast();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }

    const speechSynthesis = window.speechSynthesis;
    
    if (!speechSynthesis) {
      setIsSupported(false);
      return;
    }

    synthRef.current = speechSynthesis;

    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // Load voices immediately
    loadVoices();

    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Speak text with options
  const speak = useCallback((text: string, options: TTSOptions = {}) => {
    if (!synthRef.current || !isSupported || !text) {
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    if (options.voice) {
      utterance.voice = options.voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentText(text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentText(null);
      
      // Process queue if there are more items
      if (queueRef.current.length > 0) {
        const nextText = queueRef.current.shift();
        if (nextText) {
          speak(nextText, options);
        }
      }
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentText(null);
      
      toast({
        title: "Text-to-speech error",
        description: "Failed to read text aloud. Please try again.",
        variant: "destructive",
      });
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  }, [isSupported, toast]);

  // Pause speech
  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  // Resume speech
  const resume = useCallback(() => {
    if (synthRef.current && isSpeaking && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  }, [isSpeaking, isPaused]);

  // Stop speech
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentText(null);
      queueRef.current = [];
    }
  }, []);

  // Skip current speech (same as stop for single utterances)
  const skip = useCallback(() => {
    stop();
  }, [stop]);

  return {
    speak,
    pause,
    resume,
    stop,
    skip,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    currentText,
  };
}
