interface Props {
  rawContent: string;
  title: string;
}

interface Segment {
  label: string;
  zone: string; // "Z1", "Z2", "Z3", "Z4", "Z5", "Recovery", "Warmup"
  duration: number; // minutes
  bpmRange?: string;
  isKey?: boolean; // bold/main effort
  repeats?: number;
  restDuration?: number;
}

interface WorkoutMeta {
  pace?: string;
  focus?: string;
  important?: string;
  intensity?: string;
  duration?: string;
  distance?: string;
  specials?: { label: string; value: string }[];
  gear?: string[];
  notes?: string[];
}

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Recovery: { bg: 'bg-sky-900/40', border: 'border-sky-600', text: 'text-sky-300' },
  Z1: { bg: 'bg-emerald-900/40', border: 'border-emerald-600', text: 'text-emerald-300' },
  Z2: { bg: 'bg-green-900/40', border: 'border-green-500', text: 'text-green-300' },
  Z3: { bg: 'bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-300' },
  Z4: { bg: 'bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-300' },
  Z5: { bg: 'bg-red-900/40', border: 'border-red-500', text: 'text-red-300' },
};

const ZONE_BAR_COLORS: Record<string, string> = {
  Recovery: 'bg-sky-500',
  Z1: 'bg-emerald-500',
  Z2: 'bg-green-500',
  Z3: 'bg-yellow-500',
  Z4: 'bg-orange-500',
  Z5: 'bg-red-500',
};

function parseSegments(rawContent: string): { segments: Segment[]; meta: WorkoutMeta } {
  const segments: Segment[] = [];
  const meta: WorkoutMeta = {};
  const notes: string[] = [];

  const lines = rawContent.split('\n');

  for (const line of lines) {
    const rawTrimmed = line.trim().replace(/^-\s*/, '');
    const trimmed = rawTrimmed.replace(/\*\*/g, '');

    // Repeats: 5x 4min @ Z4 (161-174 bpm) mit 3min Z1 Trabpause
    const repeatMatch = trimmed.match(/(\d+)x\s*(\d+)min\s*@\s*(Z\d)(?:\s*\((\d+-\d+)\s*bpm\))?\s*(?:mit|with)\s*(\d+)min/i);
    if (repeatMatch) {
      const [, reps, dur, zone, bpm, rest] = repeatMatch;
      segments.push({
        label: `${reps}x ${dur}min @ ${zone}`,
        zone,
        duration: parseInt(reps) * (parseInt(dur) + parseInt(rest)),
        bpmRange: bpm,
        isKey: true,
        repeats: parseInt(reps),
        restDuration: parseInt(rest),
      });
      continue;
    }

    // Duration with explicit zone: 20min @ Z3 (153-160 bpm) or 10min Warm-up @ Z1-Z2 (120-145 bpm)
    const zoneMatch = trimmed.match(/(\d+)min\s+(?:(.*?)\s*)?@\s*(Z\d)(?:\s*(?:-\s*)?(?:Z\d))?(?:\s*\((\d+-\d+)\s*bpm\))?/);
    if (zoneMatch) {
      const [, dur, label, zone, bpm] = zoneMatch;
      const isBold = rawTrimmed.includes('**');
      const labelPart = label?.trim() ? `${label.trim()} @ ${zone}` : `@ ${zone}`;
      segments.push({
        label: `${dur}min ${labelPart}`,
        zone,
        duration: parseInt(dur),
        bpmRange: bpm,
        isKey: isBold,
      });
      continue;
    }

    // Duration without zone but with warm/cool/recovery keywords
    const simpleMatch = trimmed.match(/(\d+)min\s+(.+?)(?:\s*\((\d+-\d+)\s*bpm\))?$/);
    if (simpleMatch && (trimmed.toLowerCase().includes('warm') || trimmed.toLowerCase().includes('cool') || trimmed.toLowerCase().includes('recovery'))) {
      const [, dur, label, bpm] = simpleMatch;
      let zone = 'Z1';
      if (label.toLowerCase().includes('recovery')) zone = 'Recovery';
      segments.push({
        label: `${dur}min ${label.trim()}`,
        zone,
        duration: parseInt(dur),
        bpmRange: bpm,
        isKey: false,
      });
      continue;
    }

    // Parse meta info (match on raw to detect ** labels, use trimmed value)
    const paceMatch = rawTrimmed.match(/\*\*Pace.*?:\*\*\s*(.+)/);
    if (paceMatch) { meta.pace = paceMatch[1]; continue; }

    const focusMatch = rawTrimmed.match(/\*\*Fokus:\*\*\s*(.+)/) || rawTrimmed.match(/\*\*Focus:\*\*\s*(.+)/);
    if (focusMatch) { meta.focus = focusMatch[1]; continue; }

    const importantMatch = rawTrimmed.match(/\*\*Wichtig:\*\*\s*(.+)/);
    if (importantMatch) { meta.important = importantMatch[1]; continue; }

    // Intensity: Z1 only (120-135 bpm) or Z1-Z2 (120-150 bpm)
    const intensityMatch = rawTrimmed.match(/\*\*Intensity:\*\*\s*(.+)/);
    if (intensityMatch) {
      meta.intensity = intensityMatch[1].replace(/⚠️.*$/, '').trim();
      // Extract warning from intensity line
      const warnInIntensity = intensityMatch[1].match(/⚠️\s*(.+)/);
      if (warnInIntensity) meta.important = warnInIntensity[1];
      continue;
    }

    // Dauer: Exakt 30min or 30min
    const dauerMatch = rawTrimmed.match(/\*\*Dauer:\*\*\s*(.+)/);
    if (dauerMatch) { meta.duration = dauerMatch[1]; continue; }

    // Distanz
    const distanzMatch = rawTrimmed.match(/\*\*Distanz:\*\*\s*(.+)/);
    if (distanzMatch) { meta.distance = distanzMatch[1]; continue; }

    // Special segment instructions like "Letztes Drittel"
    const specialMatch = rawTrimmed.match(/\*\*(.+?):\*\*\s*(.+)/);
    if (specialMatch && !trimmed.startsWith('Structure')) {
      meta.specials = [...(meta.specials || []), { label: specialMatch[1], value: specialMatch[2] }];
      continue;
    }

    if (trimmed.includes('BRUSTGURT')) {
      meta.gear = [...(meta.gear || []), '⌚ Brustgurt'];
      continue;
    }

    // Collect notes (non-empty, non-structure lines that aren't just formatting)
    if (trimmed && !trimmed.startsWith('Structure') && !trimmed.startsWith('*') && trimmed !== '---' && trimmed.length > 3) {
      notes.push(trimmed.replace(/\*\*/g, ''));
    }
  }

  meta.notes = notes.filter(n => n.length > 5);
  return { segments, meta };
}

export default function WorkoutPlanView({ rawContent }: Props) {
  const { segments, meta } = parseSegments(rawContent);
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  // If no segments parsed, render meta-only view
  if (segments.length === 0) {
    const hasMeta = meta.intensity || meta.pace || meta.duration || meta.distance || meta.focus;
    if (!hasMeta) {
      return (
        <div className="text-left">
          <pre className="text-xs bg-slate-800 p-3 rounded whitespace-pre-wrap text-slate-300">
            {rawContent}
          </pre>
        </div>
      );
    }

    // Determine zone from intensity for color coding
    const zoneFromIntensity = meta.intensity?.match(/(Z\d)/)?.[1] || 'Z1';
    const colors = ZONE_COLORS[zoneFromIntensity] || ZONE_COLORS.Z1;
    const barColor = ZONE_BAR_COLORS[zoneFromIntensity] || ZONE_BAR_COLORS.Z1;

    return (
      <div className="text-left max-w-2xl mx-auto space-y-5">
        {/* Single zone bar */}
        <div>
          <div className={`${barColor} rounded-lg h-8 flex items-center justify-center text-[10px] font-bold text-white/90`}>
            {zoneFromIntensity}
          </div>
          {meta.duration && (
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-0.5">
              <span>0</span>
              <span>{meta.duration}</span>
            </div>
          )}
        </div>

        {/* Single segment card */}
        <div className={`flex items-center gap-3 px-3 py-3 rounded-lg border ${colors.bg} ${colors.border} border-opacity-30`}>
          <div className={`text-xs font-mono font-bold ${colors.text} w-8 shrink-0`}>
            {zoneFromIntensity}
          </div>
          <div className="flex-1">
            <span className="text-sm font-bold text-white">{meta.intensity}</span>
          </div>
          {meta.duration && (
            <span className="text-xs text-slate-400 font-mono shrink-0">{meta.duration}</span>
          )}
        </div>

        <MetaInfo meta={meta} />
      </div>
    );
  }

  return (
    <div className="text-left max-w-2xl mx-auto space-y-5">
      {/* Zone bar visualization */}
      <div>
        <div className="flex rounded-lg overflow-hidden h-8 gap-0.5">
          {segments.map((seg, i) => {
            const widthPct = Math.max((seg.duration / totalDuration) * 100, 5);
            const barColor = ZONE_BAR_COLORS[seg.zone] || ZONE_BAR_COLORS.Z1;
            return (
              <div
                key={i}
                className={`${barColor} ${seg.isKey ? 'opacity-100' : 'opacity-60'} flex items-center justify-center text-[10px] font-bold text-white/90 transition-all`}
                style={{ width: `${widthPct}%` }}
                title={seg.label}
              >
                {widthPct > 12 ? seg.zone : ''}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-0.5">
          <span>0</span>
          <span>{totalDuration} min</span>
        </div>
      </div>

      {/* Segments detail */}
      <div className="space-y-1.5">
        {segments.map((seg, i) => {
          const colors = ZONE_COLORS[seg.zone] || ZONE_COLORS.Z1;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} border-opacity-30`}
            >
              <div className={`text-xs font-mono font-bold ${colors.text} w-8 shrink-0`}>
                {seg.zone}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${seg.isKey ? 'font-bold text-white' : 'text-slate-300'}`}>
                  {seg.label}
                </span>
                {seg.repeats && seg.restDuration && (
                  <span className="text-xs text-slate-500 ml-2">
                    ({seg.restDuration}min Pause)
                  </span>
                )}
              </div>
              {seg.bpmRange && (
                <span className="text-xs text-slate-500 font-mono shrink-0">
                  {seg.bpmRange} bpm
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono w-10 text-right shrink-0">
                {seg.duration}′
              </span>
            </div>
          );
        })}
      </div>

      <MetaInfo meta={meta} />
    </div>
  );
}

function MetaInfo({ meta }: { meta: WorkoutMeta }) {
  return (
    <div className="space-y-2 pt-2 border-t border-slate-700/50">
      {meta.intensity && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 shrink-0">💓</span>
          <span className="text-slate-300">{meta.intensity}</span>
        </div>
      )}
      {meta.pace && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 shrink-0">🏃</span>
          <span className="text-slate-300">{meta.pace}</span>
        </div>
      )}
      {meta.distance && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 shrink-0">📏</span>
          <span className="text-slate-300">{meta.distance}</span>
        </div>
      )}
      {meta.focus && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 shrink-0">🎯</span>
          <span className="text-slate-300">{meta.focus}</span>
        </div>
      )}
      {meta.specials && meta.specials.map((s, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="text-purple-400 shrink-0">⚡</span>
          <span className="text-slate-300"><strong className="text-purple-300">{s.label}:</strong> {s.value}</span>
        </div>
      ))}
      {meta.important && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-amber-500 shrink-0">⚠️</span>
          <span className="text-amber-200">{meta.important}</span>
        </div>
      )}
      {meta.gear && meta.gear.length > 0 && (
        <div className="flex items-center gap-2">
          {meta.gear.map((g, i) => (
            <span key={i} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">
              {g}
            </span>
          ))}
        </div>
      )}
      {meta.notes && meta.notes.length > 0 && (
        <div className="text-xs text-slate-500 mt-2 space-y-1">
          {meta.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
