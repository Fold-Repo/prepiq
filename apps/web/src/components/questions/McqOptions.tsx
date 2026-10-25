'use client';

import React from 'react';

export interface McqOption {
  label: string;
  text: string;
}

function cleanOptionText(text: string): string {
  return text.replace(/^(CORRECT|FALSE|TRUE|WRONG)\s*[–—\-:]\s*/i, '').trim();
}

export function normalizeQuestionOptions(raw: unknown): McqOption[] {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? safeParse(raw) : raw;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item, index) => {
      if (typeof item === 'string') {
        const match = item.trim().match(/^([a-dA-D])\s*[).:\-]\s*(.*)$/);
        if (match) return { label: match[1].toLowerCase(), text: cleanOptionText(match[2]) };
        return { label: String.fromCharCode(97 + index), text: cleanOptionText(item) };
      }
      if (item && typeof item === 'object' && 'text' in item) {
        const label =
          typeof (item as McqOption).label === 'string'
            ? (item as McqOption).label.replace(/[^a-dA-D]/g, '').toLowerCase() || String.fromCharCode(97 + index)
            : String.fromCharCode(97 + index);
        return { label, text: cleanOptionText(String((item as McqOption).text || '')) };
      }
      return null;
    })
    .filter((item): item is McqOption => !!item && item.text.length > 0);
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function normalizeCorrectLabel(value?: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/([a-dA-D])/);
  return match ? match[1].toLowerCase() : null;
}

export function McqOptions({
  options,
  correctOption,
  showCorrect = true,
}: {
  options: unknown;
  correctOption?: string | null;
  showCorrect?: boolean;
}) {
  const items = normalizeQuestionOptions(options);
  if (items.length === 0) return null;
  const correct = normalizeCorrectLabel(correctOption);

  return (
    <ul className="mt-3 space-y-2">
      {items.map((option) => {
        const isCorrect = showCorrect && correct === option.label;
        return (
          <li
            key={option.label}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <span
              className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isCorrect ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {option.label.toUpperCase()}
            </span>
            <span className="leading-relaxed">{option.text}</span>
            {isCorrect && (
              <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Correct
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AnswerSourceBadge({
  source,
}: {
  source?: 'NONE' | 'EXTRACTED' | 'CONTEXT' | 'AI' | 'MANUAL' | null;
}) {
  if (!source || source === 'NONE') return null;
  const labels: Record<string, string> = {
    EXTRACTED: 'From answer key',
    CONTEXT: 'From course / syllabus',
    AI: 'AI inferred',
    MANUAL: 'Manual',
  };
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {labels[source] || source}
    </span>
  );
}
