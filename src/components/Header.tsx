'use client';

import React from 'react';
import { Sparkles, RefreshCw, SlidersHorizontal, Cpu, Bookmark, Radio } from 'lucide-react';

interface HeaderProps {
  onSync: () => void;
  onCurate: () => void;
  onOpenSettings: () => void;
  isSyncing: boolean;
  isCurating: boolean;
  totalItems: number;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSync,
  onCurate,
  onOpenSettings,
  isSyncing,
  isCurating,
  totalItems,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                AI Radar <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">Feed</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Curated intelligence from Hacker News, Reddit, GitHub, ArXiv & AI Labs
            </p>
          </div>
        </div>

        {/* Live Status & Quick Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!hasApiKey && (
            <button
              onClick={onOpenSettings}
              className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition"
              title="Click to add your Gemini API Key for deep curation"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Connect Gemini API</span>
            </button>
          )}

          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" />
            <span>{totalItems} items indexed</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>

          {/* Curate with Gemini Button */}
          <button
            onClick={onCurate}
            disabled={isCurating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isCurating ? 'animate-spin' : ''}`} />
            <span>{isCurating ? 'Curating...' : 'AI Curate'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
            title="Feed Settings & Sources"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
