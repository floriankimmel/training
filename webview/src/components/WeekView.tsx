import React, { useState, useRef, useEffect } from 'react';
import type { WeekData, FeedbackData, Session, FeedbackSession } from '../lib/parseTraining';
import FeedbackModal from './FeedbackPanel';

interface Props {
  weekData: WeekData;
  feedbackData: FeedbackData | null;
}

const typeColors: Record<string, string> = {
  run: 'border-l-emerald-500',
  rest: 'border-l-slate-600',
  strength: 'border-l-amber-500',
};

function getSessionIcon(title: string): string {
  if (title.toLowerCase().includes('hill') || title.toLowerCase().includes('berg')) return '⛰️';
  if (title.toLowerCase().includes('intervall')) return '⚡';
  if (title.toLowerCase().includes('long') || title.toLowerCase().includes('lang')) return '🏃‍♂️';
  if (title.toLowerCase().includes('recovery') || title.toLowerCase().includes('erholung')) return '🚶';
  if (title.toLowerCase().includes('rest') || title.toLowerCase().includes('ruhe')) return '🛌';
  if (title.toLowerCase().includes('tempo')) return '💨';
  return '🏃';
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function isPast(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

type SessionStatus = 'missed' | 'done' | 'upcoming' | 'today';

function getSessionStatus(session: Session, hasFeedback: boolean): SessionStatus {
  if (session.type === 'rest') return 'upcoming'; // rest days neutral
  if (hasFeedback) return 'done';
  if (isPast(session.date)) return 'missed';
  if (isToday(session.date)) return 'today';
  return 'upcoming';
}

const statusColors: Record<SessionStatus, { border: string; bg: string; text: string }> = {
  missed: { border: 'border-l-red-500', bg: 'bg-red-900/15', text: 'text-red-400' },
  done: { border: 'border-l-emerald-500', bg: 'bg-emerald-900/15', text: 'text-emerald-400' },
  today: { border: 'border-l-slate-400', bg: 'bg-slate-800/60', text: 'text-slate-300' },
  upcoming: { border: 'border-l-yellow-500', bg: 'bg-yellow-900/10', text: 'text-yellow-400' },
};

export default function WeekView({ weekData, feedbackData }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const selectableSessions = weekData.sessions;

  const selectedSession = selectedIndex !== null ? (() => {
    const session = selectableSessions[selectedIndex];
    const feedback = findFeedbackForSession(session);
    return { session, feedback };
  })() : null;

  function findFeedbackForSession(session: Session): FeedbackSession | undefined {
    if (!feedbackData) return undefined;
    return feedbackData.sessions.find(f => f.date === session.date);
  }

  // Auto-select today on mount if in this week
  useEffect(() => {
    const todayDate = new Date().toISOString().split('T')[0];
    const idx = selectableSessions.findIndex(s => s.date === todayDate);
    if (idx >= 0) {
      setSelectedIndex(idx);
    }
  }, []);

  // j/k navigation, o to open, esc to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Escape closes modal
      if (e.key === 'Escape' && modalOpen) {
        e.preventDefault();
        setModalOpen(false);
        return;
      }

      // Don't handle j/k/o when modal is open (modal handles its own j/k)
      if (modalOpen) return;

      if (e.key === 'j') {
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return Math.min(prev + 1, selectableSessions.length - 1);
        });
      }
      if (e.key === 'k') {
        e.preventDefault();
        setSelectedIndex(prev => {
          if (prev === null) return 0;
          return Math.max(prev - 1, 0);
        });
      }
      if (e.key === 'o' && selectedIndex !== null) {
        e.preventDefault();
        const session = selectableSessions[selectedIndex];
        if (session?.type !== 'rest' || findFeedbackForSession(session)) {
          setModalOpen(true);
        }
      }
      if (e.key === 'f' && selectedIndex !== null) {
        e.preventDefault();
        const session = selectableSessions[selectedIndex];
        document.dispatchEvent(new CustomEvent('open-chat-with-message', {
          detail: { message: `Give me feedback for the session on ${session.date}`, autoSend: true }
        }));
      }
      if (e.key === 't') {
        e.preventDefault();
        // Check if today is in this week (any session, including rest)
        const allTodayIdx = weekData.sessions.findIndex(s => isToday(s.date));
        if (allTodayIdx >= 0) {
          // Find matching selectable session
          const todayDate = weekData.sessions[allTodayIdx].date;
          const selectableIdx = selectableSessions.findIndex(s => s.date === todayDate);
          if (selectableIdx >= 0) {
            setSelectedIndex(selectableIdx);
          }
          const el = document.querySelector('[data-today="true"]');
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Navigate to week containing today
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const thu = new Date(d);
          thu.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
          const yearStart = new Date(thu.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          window.location.href = `/?week=${weekNum}&year=${thu.getFullYear()}`;
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectableSessions.length, selectedIndex, modalOpen]);

  function findFeedback(session: Session): FeedbackSession | undefined {
    if (!feedbackData) return undefined;
    return feedbackData.sessions.find(f => f.date === session.date);
  }

  function handleSessionClick(session: Session) {
    const idx = selectableSessions.findIndex(s => s.date === session.date);
    setSelectedIndex(idx >= 0 ? idx : null);
    if (session.type !== 'rest' || findFeedbackForSession(session)) setModalOpen(true);
  }

  return (
    <>
      {/* Sessions List */}
      <div className="space-y-2">
        {weekData.sessions.map((session, i) => {
          const feedback = findFeedback(session);
          const hasFeedback = !!feedback;
          const isRest = session.type === 'rest';
          const today = isToday(session.date);
          const status = getSessionStatus(session, hasFeedback);
          const colors = isRest ? null : statusColors[status];
          
          return (
            <div
              key={i}
              data-today={today ? 'true' : undefined}
              onClick={() => handleSessionClick(session)}
              className={`
                border-l-4 ${colors ? colors.border : typeColors[session.type]}
                ${today ? 'ring-1 ring-emerald-500/30' : ''}
                ${colors ? colors.bg : 'bg-slate-800/60'}
                rounded-r-lg px-4 py-3
                ${!isRest ? 'cursor-pointer hover:bg-slate-700/60 transition-colors' : 'cursor-pointer opacity-60 hover:opacity-80 transition-colors'}
                ${selectedSession?.session.date === session.date ? 'ring-1 ring-emerald-500/50 bg-slate-700/60' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm w-6 ${today ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    {session.day}
                  </span>
                  <span className="text-lg">{getSessionIcon(session.title)}</span>
                  <div>
                    <span className="font-medium">{session.title}</span>
                    {session.duration && session.duration !== '-' && (
                      <span className="text-slate-400 text-sm ml-2">— {session.duration}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {feedback?.rating && (
                    <span className="text-sm bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                      {feedback.rating}
                    </span>
                  )}
                  {hasFeedback && (
                    <span className="text-emerald-400 text-xs">📊</span>
                  )}
                  {today && (
                    <span className="text-xs bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded">heute</span>
                  )}
                </div>
              </div>
              {!isRest && (
                <div className="text-xs text-slate-500 mt-1 ml-9">
                  {session.date}
                  {hasFeedback && <span className="ml-2 text-emerald-600">• Feedback verfügbar</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feedback Modal */}
      {modalOpen && selectedSession && (
        <FeedbackModal
          session={selectedSession.session}
          feedback={selectedSession.feedback}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
