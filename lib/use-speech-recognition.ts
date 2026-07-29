"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal shape covering only what this hook uses — the DOM lib's built-in
// SpeechRecognition types are inconsistent across TS/lib.dom versions (still
// marked experimental), so a small local interface avoids depending on
// ambient types that may or may not be present.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

// Wraps the browser's native SpeechRecognition (Web Speech API) — Chrome and
// Edge implement it well (as webkitSpeechRecognition), Safari's support is
// unreliable (iOS Safari in particular), Firefox has none at all. Callers
// just check `.isSupported` and hide/disable their mic UI entirely when
// false — typed input must never be blocked by voice being unavailable. No
// server round-trip: recognition runs fully client-side in the browser
// engine (audio may still leave the device to the browser vendor's own
// recognition service — this is a browser implementation detail, not
// something this app controls).
export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    );

  useEffect(() => {
    if (!isSupported) return;
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) onResultRef.current(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [isSupported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setIsListening(true);
    recognitionRef.current.start();
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, start, stop };
}
