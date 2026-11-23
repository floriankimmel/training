import fs from 'node:fs';
import path from 'node:path';

import type { EinheitArt, Plan } from './core';
import { repoPath } from './repo';

// Week plans are parsed by the Python core (training/plan.py, via lib/core.ts);
// this module only shapes them for the UI and parses feedback files.
const FEEDBACK_DIR = repoPath('feedback');

export interface Session {
  day: string; // "Mo", "Di", ...
  date: string; // "2026-06-08"
  title: string; // first Einheit of the day
  duration: string; // "50min"
  type: EinheitArt;
  rawContent: string; // whole day section (all Einheiten), shown in the modal
  extras?: { title: string; duration: string; type: EinheitArt }[]; // further Einheiten same day
}

export interface WeekData {
  weekNumber: number;
  year: number;
  title: string;
  philosophy: string;
  sessions: Session[];
  summaryTable: string;
  legacy: boolean;
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
  summary?: string;   // Fazit-Absatz nach der Bewertung
}

const SHORT_DAY: Record<string, string> = {
  Monday: 'Mo', Tuesday: 'Di', Wednesday: 'Mi', Thursday: 'Do', Friday: 'Fr', Saturday: 'Sa', Sunday: 'So',
};

export function weekDataFromPlan(plan: Plan): WeekData {
  const sessions: Session[] = plan.days.map(d => {
    const [first, ...rest] = d.einheiten;
    const firstLine = d.body.split('\n').find(l => l.trim())?.replace(/^[-*#>\s]+/, '').trim();
    return {
      day: SHORT_DAY[d.weekday] ?? d.weekday,
      date: d.date,
      title: first?.title ?? firstLine ?? 'Ruhetag',
      duration: first?.duration || (!first || first.kind === 'rest' ? '-' : ''),
      type: first?.kind ?? 'rest',
      rawContent: d.body,
      extras: rest.map(e => ({ title: e.title, duration: e.duration, type: e.kind ?? 'run' })),
    };
  });
  return {
    weekNumber: plan.week,
    year: plan.year,
    title: plan.title,
    philosophy: plan.philosophy,
    sessions,
    summaryTable: plan.summary_table,
    legacy: plan.legacy,
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
    // Fazit = erster nicht-leerer Absatz nach der Bewertungs-Überschrift
    let summary: string | undefined;
    const bewIdx = feedbackContent.search(/### 🎯\s*\*{0,2}Bewertung:/);
    if (bewIdx >= 0) {
      const after = feedbackContent.slice(bewIdx).split('\n').slice(1);
      const para: string[] = [];
      for (const line of after) {
        const t = line.trim();
        if (!t) { if (para.length) break; else continue; }
        if (t.startsWith('#')) break;
        para.push(t);
      }
      summary = para.join(' ').replace(/\*\*/g, '').trim() || undefined;
    }
    sessions.push({
      date,
      title: title.trim(),
      content: feedbackContent.trim(),
      rating: ratingMatch ? ratingMatch[1].trim() : undefined,
      summary,
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
  
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
}
