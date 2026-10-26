'use client';

import React from 'react';
import { Search, Sparkles, Clock, Bookmark, X, Filter } from 'lucide-react';

interface FilterBarProps {
  view: 'curated' | 'latest' | 'bookmarks';
  onViewChange: (view: 'curated' | 'latest' | 'bookmarks') => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'hn', label: 'Hacker News' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'github', label: 'GitHub' },
  { id: 'lobsters', label: 'Lobste.rs' },
  { id: 'arxiv', label: 'ArXiv Papers' },
  { id: 'rss', label: 'AI Blogs & Feeds' },
  { id: 'producthunt', label: 'Product Hunt' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'Agents & Tooling', label: 'Agents & Tooling' },
  { id: 'Models & Weights', label: 'Models & Weights' },
  { id: 'Research Paper', label: 'Research Papers' },
  { id: 'Open Source Repo', label: 'Open Source Repos' },
  { id: 'Industry & Launches', label: 'Industry & Launches' },
  { id: 'Tutorials & Eng', label: 'Tutorials & Eng' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  view,
  onViewChange,
  selectedSource,
  onSourceChange,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="mb-6 space-y-4">
      {/* Top Row: Main View Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => onViewChange('curated')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              view === 'curated'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Top Picks (Curated)</span>
          </button>

          <button
            onClick={() => onViewChange('latest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              view === 'latest'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>All Latest</span>
          </button>

          <button
            onClick={() => onViewChange('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              view === 'bookmarks'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarks</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search AI titles, summaries, topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Second Row: Source filter pills & Category pills */}
      <div className="flex flex-col gap-2">
        {/* Source Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">Source:</span>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSourceChange(s.id)}
              className={`text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap transition font-medium ${
                selectedSource === s.id
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">Topic:</span>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              className={`text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap transition font-medium ${
                selectedCategory === c.id
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50'
                  : 'bg-zinc-900/40 text-zinc-400 border-zinc-800/60 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
