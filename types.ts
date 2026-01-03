
export enum Quarter {
  Q1 = "1º Trimestre",
  Q2 = "2º Trimestre",
  Q3 = "3º Trimestre",
  Q4 = "4º Trimestre"
}

export interface Phase {
  id: number;
  name: string;
  description: string;
  books: string[];
}

export interface ReadingEntry {
  date: string; // MM-DD
  reading: string;
  isMeditationDay: boolean;
  quarter: Quarter;
  phaseId: number;
  focus: string;
}

export interface DailyGoalsConfig {
  readingMinutes: number;
  prayerMinutes: number;
  extraChapters: number;
}

export interface DailyGoalProgress {
  date: string; // YYYY-MM-DD
  readingDone: boolean;
  prayerDone: boolean;
  extraDone: boolean;
}

export interface UserProgress {
  completedDates: string[]; // List of MM-DD
  reflections: Record<string, string>; // date -> text
  userName: string;
  startDate: string; // ISO string
  version: "ARC" | "KJV" | "SCOFIELD";
  badges: string[];
  reminders: Reminder[];
  savedDevotionals: Record<string, any>; // MM-DD -> Devotional object
  lastViewedDate: string; // MM-DD
  dailyGoalsConfig: DailyGoalsConfig;
  dailyGoalProgress: DailyGoalProgress;
}

export interface Reminder {
  id: string;
  time: string; // HH:mm
  label: string;
  type: 'prayer' | 'reading';
  active: boolean;
}

export interface Devotional {
  title: string;
  verse: string;
  reflection: string;
  practicalPoints: string[];
  prayer: string;
}

export interface DictionaryTerm {
  term: string;
  definition: string;
}
