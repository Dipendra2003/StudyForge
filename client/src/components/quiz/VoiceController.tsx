import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, CheckCircle2, Pause, Play, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface VoiceControllerProps {
  enabled: boolean;
  onVoiceInput: (transcript: string) => void;
  onSpeechEnd: () => void;
  textToSpeak?: string;
  autoSpeak?: boolean;
  showTTSControls?: boolean;
}

export function VoiceController({
  enabled,
  onVoiceInput,
  onSpeechEnd,
  textToSpeak,
  autoSpeak = false,
  showTTSControls = true,
}: VoiceControllerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const previousTextRef = useRef<string>('');
  
  const { toast } = useToast();
  const tts = useTextToSpeech();

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    if (!SpeechRecognitionAPI || !speechSynthesis) {
      setBrowserSupported(false);
      setError('Your browser does not support voice features. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      // Update transcript display
      setTranscript(finalTranscript || interimTranscript);

      // If we have a final result, pass it to the parent
      if (finalTranscript) {
        onVoiceInput(finalTranscript);
        toast({
          title: "Voice input received",
          description: "Your answer has been transcribed.",
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice recognition failed. ';
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          errorMessage += 'Microphone permission denied. Please allow microphone access.';
          setPermissionGranted(false);
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage += 'No microphone found. Please check your device.';
          break;
        case 'network':
          errorMessage += 'Network error. Please check your connection.';
          break;
        default:
          errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
      toast({
        title: "Voice recognition error",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
      onSpeechEnd();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      tts.stop();
    };
  }, [onVoiceInput, onSpeechEnd, toast, tts]);

  // Handle text-to-speech with auto-speak and interruption on navigation
  useEffect(() => {
    if (!enabled || !textToSpeak || !tts.isSupported || !browserSupported) {
      return;
    }

    // Check if text has changed (navigation occurred)
    if (textToSpeak !== previousTextRef.current) {
      // Stop any ongoing speech (audio interruption on navigation)
      tts.stop();
      previousTextRef.current = textToSpeak;

      // Auto-speak if enabled
      if (autoSpeak) {
        // Small delay to ensure smooth transition
        const timer = setTimeout(() => {
          tts.speak(textToSpeak);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [textToSpeak, autoSpeak, enabled, browserSupported, tts]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      toast({
        title: "Permission denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!recognitionRef.current || !browserSupported) {
      return;
    }

    // Request permission if not granted
    if (permissionGranted === null || permissionGranted === false) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        return;
      }
    }

    try {
      setError(null);
      setTranscript('');
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to start voice recognition. Please try again.');
    }
  }, [browserSupported, permissionGranted, requestMicrophonePermission]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Retry after error
  const retry = useCallback(() => {
    setError(null);
    setTranscript('');
    startListening();
  }, [startListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Toggle speaking
  const toggleSpeaking = useCallback(() => {
    if (tts.isSpeaking) {
      tts.stop();
    } else if (textToSpeak) {
      tts.speak(textToSpeak);
    }
  }, [tts, textToSpeak]);

  if (!enabled) {
    return null;
  }

  if (!browserSupported) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Voice Mode Unavailable
          </CardTitle>
          <CardDescription>
            Your browser does not support voice features. Please use Chrome, Edge, or Safari for the best experience.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Controller
          </span>
          <div className="flex gap-2">
            <Button
              variant={isListening ? "destructive" : "default"}
              size="sm"
              onClick={toggleListening}
              disabled={!browserSupported}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Listening
                </>
              )}
            </Button>
            {textToSpeak && showTTSControls && (
              <>
                <Button
                  variant={tts.isSpeaking ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleSpeaking}
                  disabled={!browserSupported}
                >
                  {tts.isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Read Aloud
                    </>
                  )}
                </Button>
                {tts.isSpeaking && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={tts.isPaused ? tts.resume : tts.pause}
                      disabled={!browserSupported}
                    >
                      {tts.isPaused ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={tts.skip}
                      disabled={!browserSupported}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Listening status indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-3 w-3 bg-red-500 rounded-full"
              />
              <span className="text-sm font-medium">Listening...</span>
              <Badge variant="secondary" className="ml-auto">
                Active
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking status indicator */}
        <AnimatePresence>
          {tts.isSpeaking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                {tts.isPaused ? (
                  <Pause className="h-4 w-4 text-blue-500" />
                ) : (
                  <Volume2 className="h-4 w-4 text-blue-500" />
                )}
              </motion.div>
              <span className="text-sm font-medium">
                {tts.isPaused ? 'Paused' : 'Speaking...'}
              </span>
              {tts.currentText && (
                <Badge variant="secondary" className="ml-auto max-w-xs truncate">
                  {tts.currentText.substring(0, 50)}...
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcribed text display */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-muted rounded-lg"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Transcribed Text:</p>
                  <p className="text-sm text-muted-foreground">{transcript}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display with retry option */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retry}
                    className="ml-4"
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Permission status */}
        {permissionGranted === false && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Microphone access is required for voice input. Please allow microphone access in your browser settings.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
