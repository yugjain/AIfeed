'use client';

import React, { useState } from 'react';
import { Newspaper, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { ExecutiveBriefing } from '@/types/feed';

interface ExecutiveBriefingCardProps {
  briefing: ExecutiveBriefing | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const ExecutiveBriefingCard: React.FC<ExecutiveBriefingCardProps> = ({
  briefing,
  onRefresh,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!briefing && !isLoading) {
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
              {briefing?.date && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                  {briefing.date}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              AI-synthesized morning radar from your top feeds
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
        <div className="mt-4 pt-4 border-t border-zinc-800/60 text-sm text-zinc-300 leading-relaxed space-y-3">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-xs font-mono">Gemini is synthesizing today's top AI developments...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-indigo max-w-none text-zinc-300 whitespace-pre-line text-sm">
              {briefing?.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
