'use client';

import React from 'react';
import {
  ExternalLink,
  MessageSquare,
  ArrowUpRight,
  Bookmark,
  Sparkles,
  Flame,
  CheckCircle2,
  Wrench,
  Cpu,
  Layers,
} from 'lucide-react';
import { FeedItem } from '@/types/feed';
import { formatTimeAgo } from '@/lib/utils';

interface FeedCardProps {
  item: FeedItem;
  onToggleBookmark: (id: string) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, onToggleBookmark }) => {
  const getSourceBadge = () => {
    switch (item.source_type) {
      case 'producthunt':
        return {
          label: 'Product Hunt',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400',
        };
      case 'hn':
        return {
          label: 'Hacker News',
          color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          dot: 'bg-orange-500',
        };
      case 'reddit':
        return {
          label: item.source_name,
          color: 'bg-red-500/10 text-red-400 border-red-500/20',
          dot: 'bg-red-500',
        };
      case 'github':
        return {
          label: 'GitHub',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dot: 'bg-purple-400',
        };
      case 'lobsters':
        return {
          label: 'Lobste.rs',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'arxiv':
        return {
          label: 'ArXiv',
          color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          dot: 'bg-cyan-400',
        };
      case 'rss':
      default:
        return {
          label: item.source_name,
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
        };
    }
  };

  const getTechnicalityBadge = () => {
    const tech = item.technicality_score ?? 2;
    if (tech <= 1) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Practical App
        </span>
      );
    }
    if (tech === 2) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-medium flex items-center gap-1">
          <Wrench className="w-2.5 h-2.5" />
          Applied Tool
        </span>
      );
    }
    if (tech === 3) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25 font-medium flex items-center gap-1">
          <Layers className="w-2.5 h-2.5" />
          Builder Stack
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-medium flex items-center gap-1">
        <Cpu className="w-2.5 h-2.5" />
        Deep Tech
      </span>
    );
  };

  const sourceMeta = getSourceBadge();

  return (
    <article className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700/80 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
      {/* Top Header Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Source Badge */}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${sourceMeta.color} flex items-center gap-1.5`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sourceMeta.dot}`} />
              {sourceMeta.label}
            </span>

            {/* Practicality / Technicality Badge */}
            {getTechnicalityBadge()}
          </div>

          <div className="flex items-center gap-2">
            {item.ai_relevance_score !== null && item.ai_relevance_score !== undefined && (
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                {item.ai_relevance_score}%
              </span>
            )}

            <span className="text-xs text-zinc-500 font-mono">
              {formatTimeAgo(item.published_at)}
            </span>

            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark(item.id)}
              className={`p-1 rounded-md transition ${
                item.is_bookmarked
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title={item.is_bookmarked ? 'Remove Bookmark' : 'Bookmark item'}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-zinc-100 group-hover:text-indigo-300 transition leading-snug mb-2.5">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5"
          >
            <span>{item.title}</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
        </h3>

        {/* Plain-English TL;DR */}
        {item.ai_tldr ? (
          <p className="text-xs text-zinc-300 leading-relaxed mb-3">
            {item.ai_tldr}
          </p>
        ) : item.raw_summary ? (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {item.raw_summary}
          </p>
        ) : null}

        {/* "Why It Matters" / How you can use it */}
        {item.ai_why_it_matters && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-indigo-950/25 border border-indigo-500/20 text-xs text-indigo-200/90 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-300">How to use it: </span>
              {item.ai_why_it_matters}
            </div>
          </div>
        )}
      </div>

      {/* Footer: Author & Engagement */}
      <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          {item.score > 0 && (
            <span className="flex items-center gap-1 text-zinc-300 font-mono">
              <Flame className="w-3 h-3 text-amber-500" />
              {item.score.toLocaleString()}
            </span>
          )}

          {item.comments_url ? (
            <a
              href={item.comments_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-zinc-200 transition font-mono"
            >
              <MessageSquare className="w-3 h-3 text-zinc-500" />
              <span>{item.comments_count}</span>
            </a>
          ) : (
            item.comments_count > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <MessageSquare className="w-3 h-3 text-zinc-500" />
                <span>{item.comments_count}</span>
              </span>
            )
          )}

          {item.author && (
            <span className="text-zinc-500 truncate max-w-[130px]">
              {item.author}
            </span>
          )}
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-indigo-400 flex items-center gap-1 transition font-medium"
        >
          <span>Open Link</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
};
