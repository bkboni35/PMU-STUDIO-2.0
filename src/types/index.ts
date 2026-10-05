export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
  defaultVoice: string;
  hasPhoneticSupport?: boolean;
  phoneticLabel?: string; // e.g. "Romaji", "Pinyin", "Phonetics"
}

export interface Partner {
  id: string;
  name: string;
  languageId: string;
  title: string;
  personality: string;
  tone: string;
  voiceName: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  accent: string;
  avatarSeed: string;
  starterPhrase: string;
  interests: string[];
}

export interface Scenario {
  id: string;
  title: string;
  category: 'Daily Life' | 'Travel' | 'Culture & Food' | 'Work & Career' | 'Social & Friends';
  description: string;
  role: string;
  partnerRole: string;
  goal: string;
  iconName: string;
  suggestedStarters: string[];
}

export interface UserFeedback {
  hasCorrection: boolean;
  correctedSentence?: string;
  explanation?: string;
  grammarPoints?: string[];
  encouragement?: string;
}

export interface MessageSuggestion {
  target: string;
  english: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'partner';
  text: string;
  translation?: string;
  pronunciationGuide?: string;
  timestamp: number;
  userFeedback?: UserFeedback;
  suggestions?: MessageSuggestion[];
  audioBase64?: string;
  isAudioPlaying?: boolean;
}

export interface WordDetail {
  word: string;
  lemma: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  exampleTranslation: string;
  culturalNote?: string;
}

export interface SavedWord {
  id: string;
  word: string;
  lemma: string;
  phonetic: string;
  definition: string;
  language: string;
  exampleSentence: string;
  exampleTranslation: string;
  dateAdded: number;
  mastery: 'learning' | 'mastered';
}

export interface PronunciationResult {
  accuracyScore: number;
  feedback: string;
  wordsToPractice: string[];
  wellPronouncedWords?: string[];
  tip: string;
}
