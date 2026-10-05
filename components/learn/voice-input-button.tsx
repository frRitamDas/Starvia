"use client";

import * as React from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/**
 * Browser-native speech-to-text. Audio is transcribed by the browser; only the
 * resulting text is added to the composer when the student chooses to send it.
 */
export function VoiceInputButton({
  onTranscript,
  language = "english",
  disabled = false,
  className,
}: {
  onTranscript: (transcript: string) => void;
  language?: "english" | "hinglish" | "hindi";
  disabled?: boolean;
  className?: string;
}) {
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    if (disabled) return;

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("Voice input is not available in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const finalText: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) {
          const transcript = result[0]?.transcript?.trim();
          if (transcript) finalText.push(transcript);
        }
      }
      if (finalText.length) onTranscript(finalText.join(" "));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast.error("Allow microphone access in your browser to use voice input.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Voice input stopped. Please try again.");
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      toast.error("Could not start voice input. Please try again.");
    }
  }

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="icon"
      className={className}
      onClick={toggleListening}
      disabled={disabled && !listening}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      aria-pressed={listening}
      title={listening ? "Listening — click to stop" : "Ask by speaking"}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      <span className="sr-only">{listening ? "Stop voice input" : "Ask by speaking"}</span>
    </Button>
  );
}
