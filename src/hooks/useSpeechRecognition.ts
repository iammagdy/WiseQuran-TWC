import { useState, useRef, useCallback, useEffect } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "done" | "error";

export interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isIOSMode: boolean;
  status: SpeechRecognitionStatus;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

function hasWebSpeechAPI(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = hasWebSpeechAPI();

  const start = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = "ar-SA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setStatus("listening");

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) setTranscript(finalText.trim());
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(event.error);
      setStatus("error");
    };

    recognition.onend = () => {
      setInterimTranscript("");
      setStatus("done");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setStatus("idle");
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isSupported,
    isIOSMode: false,
    status,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
