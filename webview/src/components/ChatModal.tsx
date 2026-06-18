import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    const msgHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; autoSend?: boolean }>).detail;
      if (detail?.message) {
        if (detail.autoSend) {
          // Auto-submit: add as user message and send immediately
          const userMessage = detail.message;
          setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
          setIsLoading(true);
          setIsOpen(true);
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, history: [] }),
          }).then(async (response) => {
            if (response.ok && response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let assistantMsg = '';
              setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                assistantMsg += decoder.decode(value, { stream: true });
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: assistantMsg },
                ]);
              }
              if (!assistantMsg.trim()) {
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: '(no response)' },
                ]);
              }
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error connecting to pi' }]);
            }
          }).catch(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Connection failed.' }]);
          }).finally(() => setIsLoading(false));
        } else {
          setInput(detail.message);
          setIsOpen(true);
        }
      } else {
        setIsOpen(true);
      }
    };
    document.addEventListener('toggle-chat', handler);
    document.addEventListener('open-chat-with-message', msgHandler);
    return () => {
      document.removeEventListener('toggle-chat', handler);
      document.removeEventListener('open-chat-with-message', msgHandler);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        // Move cursor to end of pre-filled input
        if (inputRef.current && input) {
          inputRef.current.selectionStart = inputRef.current.value.length;
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = '';

        // Add empty assistant message, stream into it
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantMsg += decoder.decode(value, { stream: true });
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: assistantMsg },
          ]);
        }

        if (!assistantMsg.trim()) {
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: '(no response)' },
          ]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error connecting to pi' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Connection failed. Is the dev server running?' }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] max-w-[1600px] h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">🤖</span>
            <span className="font-semibold text-sm">Pi Training Assistant</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-500 hover:text-white text-sm"
          >
            ESC
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p className="text-lg mb-1">💬</p>
              <p className="text-sm">Ask about your training, request plan changes, get feedback...</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['Wie war meine Woche?', 'Nächste Woche planen', 'Intervalle anpassen'].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded-full hover:border-emerald-500/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-900/50 text-emerald-100'
                  : 'bg-slate-800 text-slate-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 px-3 py-2 rounded-lg text-sm text-slate-400 animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-slate-700 p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message pi..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
