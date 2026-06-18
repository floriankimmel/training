import { useEffect, useRef } from 'react';
import type { Session, FeedbackSession } from '../lib/parseTraining';

interface Props {
  session: Session;
  feedback?: FeedbackSession;
  onClose: () => void;
}

export default function FeedbackModal({ session, feedback, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'j') {
        e.preventDefault();
        scrollRef.current?.scrollBy({ top: 120, behavior: 'smooth' });
      }
      if (e.key === 'k') {
        e.preventDefault();
        scrollRef.current?.scrollBy({ top: -120, behavior: 'smooth' });
      }
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        const h = scrollRef.current?.clientHeight ?? 600;
        scrollRef.current?.scrollBy({ top: h / 2, behavior: 'smooth' });
      }
      if (e.key === 'u' && e.ctrlKey) {
        e.preventDefault();
        const h = scrollRef.current?.clientHeight ?? 600;
        scrollRef.current?.scrollBy({ top: -(h / 2), behavior: 'smooth' });
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] max-w-[1600px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{session.title}</h3>
            {feedback?.rating && (
              <span className="text-sm bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                {feedback.rating}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{session.date}</span>
            <span className="text-xs text-slate-600">
              <kbd className="bg-slate-700 px-1.5 py-0.5 rounded">j</kbd>/<kbd className="bg-slate-700 px-1.5 py-0.5 rounded">k</kbd> scroll
            </span>
            <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">ESC</kbd>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="px-6 py-5 overflow-y-auto flex-1">
          {feedback ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.content) }}
              />
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">
              <p className="text-xl mb-2">📝</p>
              <p>Kein Feedback für diese Session</p>
              <p className="text-xs mt-4 text-slate-600">Plan:</p>
              <pre className="text-left text-xs bg-slate-800 p-3 rounded mt-2 whitespace-pre-wrap text-slate-300">
                {session.rawContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-emerald-400 font-bold mt-4 mb-2">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-slate-300 font-semibold mt-3 mb-1">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 px-1 rounded text-emerald-300 text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-slate-300">$1. $2</li>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return '';
      const row = cells.map(c => `<td class="px-2 py-1 border border-slate-700">${c.trim()}</td>`).join('');
      return `<tr>${row}</tr>`;
    })
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  html = `<p class="mb-2">${html}</p>`;
  html = html.replace(/(<tr>.*?<\/tr>(?:\s*<br\/>)*)+/g, '<table class="w-full text-xs border-collapse my-2">$&</table>');

  return html;
}
