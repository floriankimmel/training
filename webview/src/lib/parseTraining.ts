import fs from 'node:fs';
import path from 'node:path';

// Find project root (parent of webview/) by walking up from current file
function findProjectRoot(): string {
  let dir = import.meta.dirname;
  // Walk up until we find the webview dir, then go one more level up
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === 'webview' || fs.existsSync(path.join(dir, 'trainings'))) {
      if (fs.existsSync(path.join(dir, 'trainings'))) return dir;
      return path.dirname(dir);
    }
    dir = path.dirname(dir);
  }
  // Fallback: relative to cwd
  return path.resolve(process.cwd(), '..');
}

const PROJECT_ROOT = findProjectRoot();
const TRAININGS_DIR = path.join(PROJECT_ROOT, 'trainings');
const FEEDBACK_DIR = path.join(PROJECT_ROOT, 'feedback');

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

const dayIndex: Record<string, number> = {
  'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
  'Friday': 4, 'Saturday': 5, 'Sunday': 6,
};

const monthMap: Record<string, number> = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
};

function resolveDate(dayName: string, dateStr: string, weekNum: number, year: number): string {
  // Already ISO format
  const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Text format: "April 13" or "April 13 (HEUTE)"
  const textMatch = dateStr.match(/^(\w+)\s+(\d+)/);
  if (textMatch) {
    const month = monthMap[textMatch[1]];
    const day = parseInt(textMatch[2]);
    if (month !== undefined) {
      const d = new Date(year, month, day);
      return d.toISOString().split('T')[0];
    }
  }

  // Fallback: compute from week number + day name
  const dates = getWeekDates(weekNum, year);
  const monday = new Date(dates.start);
  const offset = dayIndex[dayName] || 0;
  monday.setDate(monday.getDate() + offset);
  return monday.toISOString().split('T')[0];
}

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
  
  // Parse sessions by day headers (supports ISO dates, text dates, and Weekend blocks)
  const sessions: Session[] = [];
  const dayNames = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday';
  const sectionEnd = `\n## (?:${dayNames}|Weekend)|## Weekly Summary|## Weekly Targets|## Vergleich|## ⚠️|## 🎯|## Heart Rate|## Taper|## Key Message|## Week \\d+ Preview|---\s*\n\s*$`;
  
  // Match day headers: ## Monday, 2026-04-13 OR ## Monday, April 13 (optional suffix like (HEUTE!) 🔥)
  const dayHeaderRegex = new RegExp(
    `## (${dayNames}),\\s*(.+?)\\s*\n+([\\s\\S]*?)(?=${sectionEnd})`, 'g'
  );
  
  let match;
  while ((match = dayHeaderRegex.exec(content)) !== null) {
    const [, day, dateStr, body] = match;
    const date = resolveDate(day, dateStr.replace(/\s*[🔥🏁]\s*/g, '').trim(), weekNum, year);
    
    // Try ### Title — Duration format first
    const h3Match = body.match(/^### (.+?)(?:\s*—\s*(.+?))?\s*([🏃⛰️⚡🛌💪🏋️♂️]*)\s*\n([\s\S]*)/);
    let sessionTitle: string;
    let duration = '';
    let rawContent: string;
    
    if (h3Match) {
      sessionTitle = h3Match[1].trim();
      duration = h3Match[2] || '';
      rawContent = h3Match[4] || '';
    } else {
      // Bullet-point format: extract title from **bold** text in first bullet
      // e.g. "- **Lunch/Abend**: **Short Hill Intervals** - 40min total"
      // or "- **REST** 🛌"
      const bulletMatch = body.match(/^-\s*\*\*(?:.*?\*\*:\s*)?\*\*(.+?)\*\*(?:\s*[-–—]\s*(.+?))?\s*$/m)
        || body.match(/^-\s*\*\*(.+?)\*\*(?:\s*[-–—]\s*(.+?))?/m);
      if (bulletMatch) {
        sessionTitle = bulletMatch[1].trim();
        duration = (bulletMatch[2] || '').replace(/\s*total\s*$/i, '').trim();
      } else {
        // Last resort: first non-empty line
        const firstLine = body.trim().split('\n')[0] || '';
        sessionTitle = firstLine.replace(/^[-*#>\s]+/, '').trim() || day;
      }
      rawContent = body;
    }
    
    const isRest = /\brest\b|\bruhetag\b/i.test(sessionTitle);
    const isStrength = /kraft|strength|mark lauren|🏋️/i.test(sessionTitle);
    sessions.push({
      day: dayMap[day] || day,
      date,
      title: sessionTitle,
      duration: duration || (isRest ? '-' : ''),
      type: isRest ? 'rest' : isStrength ? 'strength' : 'run',
      rawContent: rawContent.trim(),
    });
  }
  
  // Match Weekend blocks: ## Weekend (April 18-19) or ## Weekend (May 23-24)
  const weekendRegex = /## Weekend\s*\((.+?)\)\s*\n([\s\S]*?)(?=\n## (?:Weekly Summary|Vergleich|⚠️|🎯)|---\s*\n\s*$)/g;
  while ((match = weekendRegex.exec(content)) !== null) {
    const [, dateRange, weekendContent] = match;
    // Parse sub-sessions: ### Saturday: Title — Duration or ### Sunday: Title — Duration
    const subRegex = /### (Saturday|Sunday):\s*(.+?)(?:\s*—\s*(.+?))?\s*([🏃⛰️⚡🛌💪🏋️♂️]*)\s*\n([\s\S]*?)(?=\n### (?:Saturday|Sunday):|$)/g;
    let subMatch;
    while ((subMatch = subRegex.exec(weekendContent)) !== null) {
      const [, subDay, subTitle, subDuration, , subRaw] = subMatch;
      // Compute date from week number
      const dates = getWeekDates(weekNum, year);
      const monday = new Date(dates.start);
      const offset = dayIndex[subDay] || 0;
      monday.setDate(monday.getDate() + offset);
      const subDate = monday.toISOString().split('T')[0];
      
      const isRest = subTitle.toLowerCase().includes('rest') || subTitle.toLowerCase().includes('ruhetag') || subTitle.toLowerCase().includes('unscheduled');
      const isStrength = /kraft|strength|mark lauren|🏋️/i.test(subTitle);
      sessions.push({
        day: dayMap[subDay] || subDay,
        date: subDate,
        title: subTitle.trim(),
        duration: subDuration || (isRest ? '-' : ''),
        type: isRest ? 'rest' : isStrength ? 'strength' : 'run',
        rawContent: subRaw.trim(),
      });
    }
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
