'use client';

import React, { useState } from 'react';
import { Newspaper, ChevronDown, ChevronUp, Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { ExecutiveBriefing } from '@/types/feed';

interface ExecutiveBriefingCardProps {
  briefing: ExecutiveBriefing | string | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ExecutiveBriefingCard: React.FC<ExecutiveBriefingCardProps> = ({
  briefing,
  onRefresh,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Normalize if briefing is JSON string or object
  let normalizedBriefing: ExecutiveBriefing | null = null;
  if (briefing) {
    if (typeof briefing === 'string') {
      try {
        normalizedBriefing = JSON.parse(briefing);
      } catch {
        normalizedBriefing = { date: 'Today', content: briefing, generated_at: new Date().toISOString() };
      }
    } else {
      normalizedBriefing = briefing;
    }
  }

  const content = normalizedBriefing?.content || '';
  const date = normalizedBriefing?.date || '';

  if (!normalizedBriefing && !isLoading) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-zinc-300 text-sm">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Generate your Daily AI Radar Executive Briefing</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Briefing</span>
          </button>
        </div>
      </div>
    );
  }

  // Simple Markdown renderer for briefing bullet points and links
  const renderFormattedContent = (raw: string) => {
    const lines = raw.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-semibold text-indigo-300 mt-4 mb-1.5 flex items-center gap-1.5">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemText = trimmed.replace(/^[\*\-]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed my-1">
            <span className="text-indigo-400 font-bold">•</span>
            <div>{parseInlineMarkdown(itemText)}</div>
          </div>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs text-zinc-300 leading-relaxed">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const matchStr = match[0];
      if (matchStr.startsWith('[') && matchStr.includes('](')) {
        const title = matchStr.substring(1, matchStr.indexOf(']('));
        const url = matchStr.substring(matchStr.indexOf('](') + 2, matchStr.length - 1);
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>{title}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        );
      } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-zinc-100">
            {matchStr.slice(2, -2)}
          </strong>
        );
      }

      lastIndex = match.index + matchStr.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="mb-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 via-zinc-900/40 to-zinc-950 p-5 shadow-xl shadow-indigo-950/20 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
                Daily AI Radar Briefing
              </h2>
              {date && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {date}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              AI-synthesized morning radar from your top practical feeds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs transition border border-zinc-700 disabled:opacity-50"
            title="Regenerate Executive Briefing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs transition border border-zinc-700"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 text-sm text-zinc-300 leading-relaxed space-y-2">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-xs font-mono">Gemini is synthesizing today's top AI developments...</p>
            </div>
          ) : (
            <div>{renderFormattedContent(content)}</div>
          )}
        </div>
      )}
    </div>
  );
};
