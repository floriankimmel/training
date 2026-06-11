import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Container, Key, Markdown, matchesKey, SelectList, Text, type SelectItem } from "@earendil-works/pi-tui";

interface DayPlan {
  day: string;
  shortDay: string;
  date: string;
  session: string;
  emoji: string;
}

interface DayFeedback {
  date: string;
  rating: string;
  title: string;
  content: string;
}

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

function getWeekYear(date: Date): number {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  return d.getFullYear();
}

function parsePlan(content: string): DayPlan[] {
  const days: DayPlan[] = [];
  const dayPattern =
    /^## (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d{4}-\d{2}-\d{2})/gm;
  const shortDays: Record<string, string> = {
    Monday: "Mo",
    Tuesday: "Di",
    Wednesday: "Mi",
    Thursday: "Do",
    Friday: "Fr",
    Saturday: "Sa",
    Sunday: "So",
  };

  let match;
  const sections: { day: string; date: string; start: number }[] = [];

  while ((match = dayPattern.exec(content)) !== null) {
    sections.push({ day: match[1], date: match[2], start: match.index });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const end = i + 1 < sections.length ? sections[i + 1].start : content.length;
    const block = content.slice(section.start, end);

    const titleMatch = block.match(/^### (.+)$/m);
    let session = titleMatch ? titleMatch[1].trim() : "—";
    let emoji = "";

    const emojiMatch = session.match(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}⚡🏃⛰️🛌]+)/u);
    if (emojiMatch) {
      emoji = emojiMatch[1];
      session = session.replace(emojiMatch[1], "").trim();
    }

    session = session.replace(/\s*—\s*$/, "").trim();

    if (session.length > 28) {
      session = session.slice(0, 26) + "…";
    }

    days.push({
      day: section.day,
      shortDay: shortDays[section.day] || section.day.slice(0, 2),
      date: section.date,
      session,
      emoji,
    });
  }

  return days;
}

function parseFeedback(content: string): DayFeedback[] {
  const feedback: DayFeedback[] = [];
  const sectionPattern = /^## (\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/gm;

  let match;
  const sections: { date: string; title: string; start: number }[] = [];

  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({ date: match[1], title: match[2], start: match.index });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const end = i + 1 < sections.length ? sections[i + 1].start : content.length;
    const block = content.slice(section.start, end);

    const ratingMatch = block.match(/Bewertung:\s*\**([A-F][+-]?)\**/i);
    const rating = ratingMatch ? ratingMatch[1] : "✓";

    feedback.push({ date: section.date, title: section.title, rating, content: block });
  }

  return feedback;
}

function ratingToEmoji(rating: string): string {
  if (rating === "✓") return "✅";
  if (rating.startsWith("A")) return "🟢";
  if (rating.startsWith("B")) return "🟡";
  if (rating.startsWith("C")) return "🟠";
  return "🔴";
}

export default function (pi: ExtensionAPI) {
  let cwd = "";
  let cachedDays: DayPlan[] = [];
  let cachedFeedback: DayFeedback[] = [];
  let cachedWeekTitle = "";

  async function loadWeekData(projectCwd: string) {
    cwd = projectCwd;
    const today = new Date();
    const weekNum = getISOWeek(today);
    const year = getWeekYear(today);

    const weekStr = String(weekNum).padStart(2, "0");
    const planPath = join(cwd, `trainings/week-${weekStr}-${year}.md`);
    const feedbackPath = join(cwd, `feedback/feedback-${weekStr}-${year}.md`);

    let planContent = "";
    let feedbackContent = "";

    try {
      planContent = await readFile(planPath, "utf-8");
    } catch {
      cachedDays = [];
      cachedFeedback = [];
      return;
    }

    try {
      feedbackContent = await readFile(feedbackPath, "utf-8");
    } catch {
      // No feedback yet
    }

    cachedDays = parsePlan(planContent);
    cachedFeedback = parseFeedback(feedbackContent);

    const titleMatch = planContent.match(/^# .+?-\s*(.+)$/m);
    cachedWeekTitle = titleMatch ? titleMatch[1].trim() : `Week ${weekNum}`;
  }

  async function refreshWidget(ctx: { ui: any; cwd: string }) {
    await loadWeekData(ctx.cwd);

    if (cachedDays.length === 0) {
      ctx.ui.setWidget("weekly-view", undefined);
      return;
    }

    const today = new Date();
    const weekNum = getISOWeek(today);
    const year = getWeekYear(today);
    const weekStr = String(weekNum).padStart(2, "0");
    const todayStr = today.toISOString().slice(0, 10);

    ctx.ui.setWidget("weekly-view", (_tui: any, theme: any) => {
      return {
        render(): string[] {
          const lines: string[] = [];

          const header = theme.fg(
            "accent",
            theme.bold(`── W${weekStr}/${year} ─ ${cachedWeekTitle} ──`)
          );
          lines.push(header);

          for (const day of cachedDays) {
            const fb = cachedFeedback.find((f: DayFeedback) => f.date === day.date);
            const isToday = day.date === todayStr;
            const isPast = day.date < todayStr;
            const isRest =
              day.session.toLowerCase().includes("rest") ||
              day.session.toLowerCase().includes("unscheduled");

            let dayLabel = day.shortDay;
            if (isToday) {
              dayLabel = theme.fg("accent", theme.bold(dayLabel));
            } else if (isPast) {
              dayLabel = theme.fg("muted", dayLabel);
            } else {
              dayLabel = theme.fg("dim", dayLabel);
            }

            let sessionStr = `${day.emoji ? day.emoji + " " : ""}${day.session}`;
            if (isRest) {
              sessionStr = theme.fg("dim", sessionStr);
            } else if (isToday) {
              sessionStr = theme.bold(sessionStr);
            } else if (isPast && !fb) {
              sessionStr = theme.fg("muted", sessionStr);
            }

            const rawSessionLen = `${day.emoji ? day.emoji + " " : ""}${day.session}`.length;
            const pad = Math.max(0, 32 - rawSessionLen);

            let status = "";
            if (fb) {
              const emoji = ratingToEmoji(fb.rating);
              status = `${emoji} ${fb.rating}`;
            } else if (isRest) {
              status = theme.fg("dim", "—");
            } else if (isToday) {
              status = theme.fg("warning", "⏳ today");
            } else if (isPast) {
              status = theme.fg("error", "✗ missing");
            } else {
              status = theme.fg("dim", "·");
            }

            lines.push(`  ${dayLabel}  ${sessionStr}${" ".repeat(pad)}  ${status}`);
          }

          lines.push(theme.fg("dim", `  ↩ /week to view feedback`));

          return lines;
        },
        invalidate() {},
      };
    }, { placement: "belowEditor" });
  }

  // Interactive day picker command
  pi.registerCommand("week", {
    description: "View weekly training feedback for a specific day",
    handler: async (_args, ctx) => {
      await loadWeekData(ctx.cwd);

      if (cachedDays.length === 0) {
        ctx.ui.notify("No training plan for this week", "warning");
        return;
      }

      const todayStr = new Date().toISOString().slice(0, 10);

      // Build selectable items - only days with feedback
      const items: SelectItem[] = cachedDays
        .filter((day) => {
          const fb = cachedFeedback.find((f) => f.date === day.date);
          return fb !== undefined;
        })
        .map((day) => {
          const fb = cachedFeedback.find((f) => f.date === day.date)!;
          const emoji = ratingToEmoji(fb.rating);
          return {
            value: day.date,
            label: `${day.shortDay}  ${day.emoji ? day.emoji + " " : ""}${day.session}`,
            description: `${emoji} ${fb.rating}`,
          };
        });

      if (items.length === 0) {
        ctx.ui.notify("No feedback available yet this week", "info");
        return;
      }

      const selectedDate = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        const container = new Container();

        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
        container.addChild(
          new Text(theme.fg("accent", theme.bold(`  📋 ${cachedWeekTitle} — Feedback`)), 0, 0)
        );
        container.addChild(new Text("", 0, 0));

        const selectList = new SelectList(items, Math.min(items.length, 7), {
          selectedPrefix: (t) => theme.fg("accent", t),
          selectedText: (t) => theme.fg("accent", t),
          description: (t) => theme.fg("muted", t),
          scrollInfo: (t) => theme.fg("dim", t),
          noMatch: (t) => theme.fg("warning", t),
        });
        selectList.onSelect = (item) => done(item.value);
        selectList.onCancel = () => done(null);
        container.addChild(selectList);

        container.addChild(
          new Text(theme.fg("dim", "  ↑↓ navigate • enter select • esc cancel"), 0, 0)
        );
        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

        return {
          render: (w: number) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => {
            selectList.handleInput(data);
            tui.requestRender();
          },
        };
      });

      if (!selectedDate) return;

      // Show the feedback for the selected day
      const fb = cachedFeedback.find((f) => f.date === selectedDate);
      if (!fb) return;

      // Display feedback as markdown in a scrollable view
      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const mdTheme = getMarkdownTheme();
        let scrollOffset = 0;
        let totalLines = 0;

        const md = new Markdown(fb.content, 1, 0, mdTheme);

        return {
          render: (w: number) => {
            const border = new DynamicBorder((s: string) => theme.fg("accent", s));
            const allLines: string[] = [];

            allLines.push(...border.render(w));

            const contentLines = md.render(w);
            totalLines = contentLines.length;

            // Calculate visible height (terminal height minus borders and help line)
            const termHeight = (tui as any).rows || process.stdout.rows || 40;
            const visibleHeight = Math.max(5, termHeight - 5);

            const visibleContent = contentLines.slice(scrollOffset, scrollOffset + visibleHeight);
            allLines.push(...visibleContent);

            // Scroll indicator
            if (totalLines > visibleHeight) {
              const pct = Math.round(((scrollOffset + visibleHeight) / totalLines) * 100);
              allLines.push(theme.fg("dim", `  ─── ${Math.min(pct, 100)}% ───`));
            }

            allLines.push(
              theme.fg("dim", "  j/k ↑/↓ scroll • d/u half-page • q/esc close")
            );
            allLines.push(...border.render(w));

            return allLines;
          },
          invalidate: () => md.invalidate(),
          handleInput: (data: string) => {
            const termHeight = (tui as any).rows || process.stdout.rows || 40;
            const visibleHeight = Math.max(5, termHeight - 5);
            const maxScroll = Math.max(0, totalLines - visibleHeight);

            if (matchesKey(data, Key.escape) || data === "q") {
              done();
            } else if (matchesKey(data, Key.down) || data === "j") {
              scrollOffset = Math.min(scrollOffset + 1, maxScroll);
              tui.requestRender();
            } else if (matchesKey(data, Key.up) || data === "k") {
              scrollOffset = Math.max(scrollOffset - 1, 0);
              tui.requestRender();
            } else if (data === "d") {
              scrollOffset = Math.min(scrollOffset + Math.floor(visibleHeight / 2), maxScroll);
              tui.requestRender();
            } else if (data === "u") {
              scrollOffset = Math.max(scrollOffset - Math.floor(visibleHeight / 2), 0);
              tui.requestRender();
            } else if (data === "g" || matchesKey(data, Key.home)) {
              scrollOffset = 0;
              tui.requestRender();
            } else if (data === "G" || matchesKey(data, Key.end)) {
              scrollOffset = maxScroll;
              tui.requestRender();
            }
          },
        };
      });
    },
  });

  // Keyboard shortcut for quick access
  pi.registerShortcut("ctrl+w", {
    description: "View weekly training feedback",
    handler: async (ctx) => {
      // Trigger the /week command via sendUserMessage
      pi.sendUserMessage("/week", { deliverAs: "followUp" });
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    await refreshWidget(ctx);

    // Hide built-in footer (cwd, costs, MCP status)
    ctx.ui.setFooter((_tui, _theme, _footerData) => ({
      render(_width: number): string[] { return []; },
      invalidate() {},
    }));
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      const input = event.input as { path?: string };
      if (
        input.path &&
        (input.path.includes("feedback/") || input.path.includes("trainings/"))
      ) {
        await refreshWidget(ctx);
      }
    }
  });
}
