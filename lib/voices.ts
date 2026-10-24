// Murf Falcon 2.1 voices for the Voice test (ids from GET api.murf.ai/v1/speech/voices; locale picks the language).
// Voice list: https://murf.ai/api/docs/voices-styles/voice-library (Falcon 2.1 section)
export const TTS_LANGS = ["te-IN", "hi-IN", "en-IN"] as const;
export type TtsLang = (typeof TTS_LANGS)[number];

export const VOICES: Record<TtsLang, { voiceId: string; label: string }> = {
  "te-IN": { voiceId: "en-IN-pooja", label: "Pooja (Telugu)" },
  // hi-IN, not hi-LATN: it reads Hinglish well when English words stay in Latin script.
  "hi-IN": { voiceId: "en-IN-anisha", label: "Anisha (Hindi)" },
  "en-IN": { voiceId: "en-IN-priya", label: "Priya (Indian English)" },
};
