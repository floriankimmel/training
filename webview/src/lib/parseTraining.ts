import fs from 'node:fs';
import path from 'node:path';

const TRAININGS_DIR = path.resolve(import.meta.dirname, '../../../trainings');
const FEEDBACK_DIR = path.resolve(import.meta.dirname, '../../../feedback');

export interface Session {
  day: string; // "Monday", "Tuesday", etc.
  date: string; // "2026-06-08"
  title: string; // "Hill Repeats 5x3min Z4"
  duration: string; // "50min"
  type: 'run' | 'rest' | 'strength';
  rawContent: string;
}

export interface WeekData {
  weekNumber: number;
  year: number;
  title: string;
  philosophy: string;
  sessions: Session[];
  summaryTable: string;
  rawContent: string;
}

export interface FeedbackData {
  weekNumber: number;
  year: number;
  sessions: FeedbackSession[];
  rawContent: string;
}

export interface FeedbackSession {
  date: string;
  title: string;
  content: string;
  rating?: string;
}

const dayMap: Record<string, string> = {
  'Monday': 'Mo',
  'Tuesday': 'Di',
  'Wednesday': 'Mi',
  'Thursday': 'Do',
  'Friday': 'Fr',
  'Saturday': 'Sa',
  'Sunday': 'So',
};

export function getAvailableWeeks(): { week: number; year: number }[] {
  const files = fs.readdirSync(TRAININGS_DIR).filter(f => f.match(/^week-\d+-\d+\.md$/));
  return files.map(f => {
    const match = f.match(/week-(\d+)-(\d+)\.md/);
    return { week: parseInt(match![1]), year: parseInt(match![2]) };
  }).sort((a, b) => a.year === b.year ? a.week - b.week : a.year - b.year);
}

export function parseWeekFile(weekNum: number, year: number): WeekData | null {
  const filePath = path.join(TRAININGS_DIR, `week-${String(weekNum).padStart(2, '0')}-${year}.md`);
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract title (first H1)
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : `Week ${weekNum}, ${year}`;
  
  // Extract philosophy
  const philMatch = content.match(/> \*\*(.+?)\*\*/);
  const philosophy = philMatch ? philMatch[1] : '';
  
  // Parse sessions by day headers
  const sessions: Session[] = [];
  const dayRegex = /## (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{4}-\d{2}-\d{2})\s*\n+### (.+?)(?:\s*—\s*(.+?))?\s*([🏃⛰️⚡🛌💪🏋️♂️]*)\s*\n([\s\S]*?)(?=\n## (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|## Weekly Summary|## ⚠️|---\s*\n\s*$)/g;
  
  let match;
  while ((match = dayRegex.exec(content)) !== null) {
    const [, day, date, sessionTitle, duration, , rawContent] = match;
    const isRest = sessionTitle.toLowerCase().includes('rest') || sessionTitle.toLowerCase().includes('ruhetag');
    sessions.push({
      day: dayMap[day] || day,
      date,
      title: sessionTitle,
      duration: duration || (isRest ? '-' : ''),
      type: isRest ? 'rest' : 'run',
      rawContent: rawContent.trim(),
    });
  }
  
  // Extract weekly summary table
  const summaryMatch = content.match(/## Weekly Summary\s*\n([\s\S]*?)(?=\n---|\n## )/);
  const summaryTable = summaryMatch ? summaryMatch[1].trim() : '';
  
  return {
    weekNumber: weekNum,
    year,
    title,
    philosophy,
    sessions,
    summaryTable,
    rawContent: content,
  };
}

export function parseFeedbackFile(weekNum: number, year: number): FeedbackData | null {
  const filePath = path.join(FEEDBACK_DIR, `feedback-${String(weekNum).padStart(2, '0')}-${year}.md`);
  if (!fs.existsSync(filePath)) return null;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse individual session feedback
  const sessions: FeedbackSession[] = [];
  const sessionRegex = /## (\d{4}-\d{2}-\d{2})\s*-\s*(.+?)(?:\s*-\s*\w+ Analyse)?\s*\n([\s\S]*?)(?=\n## \d{4}-\d{2}-\d{2}|## Wochen|## Weekly|---\s*\n\s*$|$)/g;
  
  let match;
  while ((match = sessionRegex.exec(content)) !== null) {
    const [, date, title, feedbackContent] = match;
    const ratingMatch = feedbackContent.match(/### 🎯\s*\*{0,2}Bewertung:\s*(.+?)\*{0,2}\s*$/m);
    sessions.push({
      date,
      title: title.trim(),
      content: feedbackContent.trim(),
      rating: ratingMatch ? ratingMatch[1].trim() : undefined,
    });
  }
  
  return { weekNumber: weekNum, year, sessions, rawContent: content };
}

export function getWeekDates(weekNum: number, year: number): { start: string; end: string } {
  // ISO week to date
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(monday), end: fmt(sunday) };
}
