"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { savePage } from "@/app/actions/admin/content";
import type { ContentKey } from "@/lib/content";

type TabData = { value: string };

const TABS: { key: ContentKey; label: string }[] = [
  { key: "about", label: "About" },
  { key: "terms", label: "Terms" },
];

const PREVIEW_STORAGE_KEY = "mrobom-content-preview-collapsed";

export function ContentEditor({
  initialTab,
  initial,
}: {
  initialTab: ContentKey;
  initial: Record<ContentKey, TabData>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ContentKey>(initialTab);
  const [values, setValues] = useState<Record<ContentKey, string>>({
    about: initial.about.value,
    terms: initial.terms.value,
  });
  const [savedValues, setSavedValues] = useState<Record<ContentKey, string>>({
    about: initial.about.value,
    terms: initial.terms.value,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = values[tab];
  const dirty = value !== savedValues[tab];

  // Remember preview collapsed state in localStorage (read after mount to avoid hydration mismatch)
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(PREVIEW_STORAGE_KEY) === "1");
  }, []);

  // Grow the textarea with its content (min 70vh) to avoid a nested scrollbar
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, Math.round(window.innerHeight * 0.7))}px`;
  }, [value, tab, collapsed]);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const togglePreview = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const switchTab = useCallback(
    (next: ContentKey) => {
      if (next === tab) return;
      if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
      setTab(next);
      setStatus("idle");
      setErrorMessage("");
      router.replace(`/admin/content?tab=${next}`, { scroll: false });
    },
    [dirty, router, tab]
  );

  const applyChange = useCallback(
    (nextValue: string, selectionStart: number, selectionEnd: number) => {
      setValues((prev) => ({ ...prev, [tab]: nextValue }));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [tab]
  );

  /** Wrap the selection with markers; with no selection, insert markers and place the cursor between them */
  const wrapSelection = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const body = selected || placeholder;
      const next = value.slice(0, start) + prefix + body + suffix + value.slice(end);
      const bodyStart = start + prefix.length;
      if (selected) {
        applyChange(next, bodyStart + body.length + suffix.length, bodyStart + body.length + suffix.length);
      } else {
        applyChange(next, bodyStart, bodyStart + body.length);
      }
    },
    [applyChange, value]
  );

  /** Prefix the selected lines (or the current line) with a marker */
  const prefixLines = useCallback(
    (prefix: string, numbered = false) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const lines = block.split("\n");
      const nextBlock = lines
        .map((line, index) => `${numbered ? `${index + 1}. ` : prefix}${line}`)
        .join("\n");
      const next = value.slice(0, lineStart) + nextBlock + value.slice(blockEnd);
      applyChange(next, lineStart + nextBlock.length, lineStart + nextBlock.length);
    },
    [applyChange, value]
  );

  const insertBlock = useCallback(
    (snippet: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const needsBreak = start > 0 && value[start - 1] !== "\n";
      const text = (needsBreak ? "\n\n" : "") + snippet;
      const next = value.slice(0, start) + text + value.slice(end);
      applyChange(next, start + text.length, start + text.length);
    },
    [applyChange, value]
  );

  const handleSave = useCallback(async () => {
    if (status === "saving") return;
    setStatus("saving");
    setErrorMessage("");

    const payload = new FormData();
    payload.set("key", tab);
    payload.set("value", value);

    const result = await savePage(payload);
    if (result.ok) {
      setSavedValues((prev) => ({ ...prev, [tab]: value }));
      setStatus("saved");
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
      setErrorMessage(result.message);
    }
  }, [status, tab, value]);

  const toolbarButtons: { label: string; title: string; onClick: () => void }[] = [
    { label: "H2", title: "Heading 2", onClick: () => prefixLines("## ") },
    { label: "H3", title: "Heading 3", onClick: () => prefixLines("### ") },
    { label: "B", title: "Bold", onClick: () => wrapSelection("**", "**", "bold text") },
    { label: "• List", title: "Bullet list", onClick: () => prefixLines("- ") },
    { label: "1. List", title: "Numbered list", onClick: () => prefixLines("", true) },
    { label: "Link", title: "Link", onClick: () => wrapSelection("[", "](https://)", "link text") },
    {
      label: "Table",
      title: "Table",
      onClick: () =>
        insertBlock("| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n"),
    },
    { label: "Note", title: "Callout", onClick: () => prefixLines("> ") },
    { label: "HR", title: "Divider", onClick: () => insertBlock("---\n") },
  ];

  return (
    <div className="space-y-3" data-dirty={dirty ? "true" : "false"}>
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => switchTab(item.key)}
            className={`px-3 py-1.5 text-[13px] font-semibold rounded border transition-colors ${
              tab === item.key
                ? "bg-green-700 border-green-700 text-white"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
            {values[item.key] !== savedValues[item.key] && (
              <span className="ml-1 text-amber-500">•</span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar: formatting buttons + preview toggle */}
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            onClick={btn.onClick}
            className="px-2 py-1 text-[12px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-amber-50 hover:border-amber-400"
          >
            {btn.label}
          </button>
        ))}
        <button
          type="button"
          onClick={togglePreview}
          className="ml-auto px-2 py-1 text-[12px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
        >
          {collapsed ? "Expand preview" : "Collapse preview"}
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${collapsed ? "" : "lg:grid-cols-2"}`}>
        {/* Editor */}
        <section className="min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValues((prev) => ({ ...prev, [tab]: event.target.value }))}
            spellCheck={false}
            className="w-full resize-none overflow-hidden rounded border border-slate-300 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:border-green-600"
            style={{ minHeight: "70vh" }}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving" || !dirty}
              className="px-4 py-1.5 text-[13px] font-semibold text-white bg-green-700 rounded hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "saving" ? "Saving" : status === "saved" ? "Saved" : "Save"}
            </button>
            <a
              href={`/${tab}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-[13px] font-semibold text-green-700 border border-green-700 rounded hover:bg-green-50"
            >
              Open page →
            </a>
            {status === "error" && (
              <span className="text-[12px] text-red-600">{errorMessage}</span>
            )}
            {dirty && status !== "error" && (
              <span className="text-[12px] text-amber-600">Unsaved changes</span>
            )}
          </div>

          {/* Markdown cheatsheet */}
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-[12px] text-slate-600">
            <div className="mb-1 font-semibold text-slate-700">Markdown cheatsheet</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
              <span><code>## Heading</code> → H2</span>
              <span><code>### Heading</code> → H3</span>
              <span><code>- Item</code> → bullet list</span>
              <span><code>1. Item</code> → numbered list</span>
              <span><code>**bold**</code> → bold</span>
              <span><code>&gt; Note</code> → callout</span>
              <span><code>[text](url)</code> → link</span>
              <span><code>| Header |</code> → table</span>
              <span><code>---</code> → divider</span>
            </div>
          </div>
        </section>

        {/* Preview: same renderer as the live site */}
        {!collapsed && (
          <section className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <div className="rounded border border-slate-300 bg-white">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-[12px] font-semibold text-slate-700">
                  Preview (same as live site)
                </span>
                <span className="text-[11px] text-slate-400">{TABS.find((t) => t.key === tab)?.label}</span>
              </div>
              <div className="h-[70vh] overflow-y-auto p-4">
                <MarkdownBody content={value} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
