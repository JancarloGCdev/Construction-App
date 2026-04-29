"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionCtor = new () => SpeechRecognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isSecureMicContext(): boolean {
  if (typeof window === "undefined") return true;
  return window.isSecureContext;
}

type Options = {
  onSessionText: (sessionText: string) => void;
  onError: (code: string) => void;
};

const LANG_FALLBACKS = ["es-419", "es", "es-ES"] as const;

/** Reconstruye el texto mostrable (parciales + finales) desde el snapshot actual de resultados. */
function fullTranscriptFromResults(results: SpeechRecognitionResultList): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const t = results[i]?.[0]?.transcript ?? "";
    if (t) parts.push(t);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * `supported` y `ready` evitan desajuste de hidratación: en servidor y 1.º render cliente
 * supported=false; tras useEffect, reflejan el API real.
 */
export function useSpeechDictation({ onSessionText, onError }: Options) {
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);

  const ref = useRef<SpeechRecognition | null>(null);
  const hadResultRef = useRef(false);
  const onSessionTextRef = useRef(onSessionText);
  onSessionTextRef.current = onSessionText;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const stoppingRef = useRef(false);
  const lastTranscriptRef = useRef("");

  useEffect(() => {
    const ctor = getCtor();
    setSupported(!!ctor && isSecureMicContext());
    setReady(true);
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    const r = ref.current;
    if (r) {
      r.onend = null;
      try {
        r.stop();
      } catch {
        // ignore
      }
      try {
        r.abort();
      } catch {
        // ignore
      }
      ref.current = null;
    }
    setListening(false);
    queueMicrotask(() => {
      stoppingRef.current = false;
    });
  }, []);

  const start = useCallback(() => {
    if (!isSecureMicContext()) {
      onErrorRef.current("service-not-allowed");
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) {
      onErrorRef.current("unsupported");
      return;
    }
    if (ref.current) {
      try {
        ref.current.onend = null;
        ref.current.stop();
      } catch {
        // ignore
      }
      ref.current = null;
    }
    hadResultRef.current = false;
    lastTranscriptRef.current = "";

    const canRetry = (code: string) =>
      code === "network" || code === "language-not-supported";

    const startWithLang = (langIndex: number) => {
      if (langIndex >= LANG_FALLBACKS.length) {
        onErrorRef.current("network");
        setListening(false);
        ref.current = null;
        return;
      }
      const r = new Ctor();
      r.lang = LANG_FALLBACKS[langIndex];
      r.interimResults = true;
      /** En móvil hace falta true para que el dictado siga escribiendo frase a frase (false corta tras la 1.ª pausa). */
      r.continuous = true;
      r.maxAlternatives = 1;

      r.onresult = (event: SpeechRecognitionEvent) => {
        hadResultRef.current = true;
        const text = fullTranscriptFromResults(event.results);
        lastTranscriptRef.current = text;
        onSessionTextRef.current(text);
      };

      r.onerror = (ev: SpeechRecognitionErrorEvent) => {
        if (stoppingRef.current) {
          if (ev.error === "aborted" || ev.error === "no-speech") {
            if (ref.current === r) ref.current = null;
            setListening(false);
            return;
          }
        }
        if (ev.error === "aborted") {
          if (ref.current === r) ref.current = null;
          setListening(false);
          return;
        }
        if (ev.error === "no-speech") {
          if (lastTranscriptRef.current.trim().length > 0 || hadResultRef.current) {
            if (ref.current === r) {
              try {
                r.onend = null;
                r.stop();
              } catch {
                // ignore
              }
              ref.current = null;
            }
            setListening(false);
            onSessionTextRef.current(lastTranscriptRef.current);
            return;
          }
        }
        if (canRetry(ev.error) && langIndex < LANG_FALLBACKS.length - 1) {
          try {
            r.onend = null;
            r.stop();
          } catch {
            // ignore
          }
          if (ref.current === r) ref.current = null;
          setTimeout(() => {
            if (!stoppingRef.current) {
              startWithLang(langIndex + 1);
            }
          }, 100);
          return;
        }
        onErrorRef.current(ev.error);
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          try {
            r.stop();
          } catch {
            // ignore
          }
        }
        if (ref.current === r) ref.current = null;
        setListening(false);
      };

      r.onend = () => {
        if (ref.current === r) {
          ref.current = null;
          setListening(false);
          onSessionTextRef.current(lastTranscriptRef.current);
        }
      };

      ref.current = r;
      setListening(true);
      try {
        r.start();
      } catch (e) {
        if (ref.current === r) ref.current = null;
        setListening(false);
        if (langIndex < LANG_FALLBACKS.length - 1) {
          setTimeout(() => {
            if (!stoppingRef.current) startWithLang(langIndex + 1);
          }, 0);
        } else {
          onErrorRef.current(e instanceof Error ? e.message : "start-failed");
        }
      }
    };

    startWithLang(0);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { listening, start, stop, supported, ready };
}
