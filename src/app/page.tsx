'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ExecutiveBriefingCard } from '@/components/ExecutiveBriefingCard';
import { FilterBar } from '@/components/FilterBar';
import { FeedCard } from '@/components/FeedCard';
import { SettingsModal } from '@/components/SettingsModal';
import { FeedItem, ExecutiveBriefing } from '@/types/feed';
import { Sparkles, RefreshCw, Inbox, AlertCircle } from 'lucide-react';

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Filters & Views
  const [view, setView] = useState<'curated' | 'latest' | 'bookmarks'>('curated');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCurating, setIsCurating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch feed items
  const fetchFeed = useCallback(
    async (currentPage = 1, append = false) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          view,
          source: selectedSource,
          category: selectedCategory,
          search: debouncedSearch,
          page: currentPage.toString(),
          limit: '30',
        });

        const res = await fetch(`/api/feed?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          if (append) {
            setItems((prev) => [...prev, ...data.data]);
          } else {
            setItems(data.data);
          }
          setTotal(data.total);
          setHasMore(data.data.length === 30 && (currentPage * 30) < data.total);
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [view, selectedSource, selectedCategory, debouncedSearch]
  );

  // Fetch briefing & initial settings
  const fetchInitialData = async () => {
    try {
      const [settingsRes, briefingRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/briefing'),
      ]);

      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setHasApiKey(settingsData.settings.has_api_key);
      }

      const briefingData = await briefingRes.json();
      if (briefingData.success && briefingData.briefing) {
        setBriefing(briefingData.briefing);
      }
    } catch (err) {
      console.error('Error fetching settings/briefing:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  // Trigger Feed Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setStatusNotification('Syncing top AI sources...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusNotification(
          `Synced ${data.sync?.totalFetched || 0} items (${data.sync?.inserted || 0} new).`
        );
        fetchFeed(1, false);
        // Refresh briefing if available
        fetchInitialData();
        setTimeout(() => setStatusNotification(null), 4000);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setStatusNotification('Sync encountered an error.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger Gemini AI Curation
  const handleCurate = async () => {
    setIsCurating(true);
    setStatusNotification('Gemini is analyzing, scoring, and summarizing items...');
    try {
      const res = await fetch('/api/sync?curateOnly=true', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusNotification(
          data.curation?.fallback
            ? 'Curated with algorithmic heuristics! (Add Gemini API key in Settings for AI summaries).'
            : `Curated ${data.curation?.processed || 0} items with Gemini!`
        );
        fetchFeed(1, false);
        setTimeout(() => setStatusNotification(null), 4000);
      }
    } catch (err) {
      console.error('Curation failed:', err);
      setStatusNotification('Curation failed.');
    } finally {
      setIsCurating(false);
    }
  };

  // Generate / Refresh Daily Briefing
  const handleRefreshBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBriefing(data.briefing);
      }
    } catch (err) {
      console.error('Failed to generate briefing:', err);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (id: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_bookmarked: !item.is_bookmarked } : item
      )
    );

    try {
      await fetch('/api/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'bookmark' }),
      });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <Header
        onSync={handleSync}
        onCurate={handleCurate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSyncing={isSyncing}
        isCurating={isCurating}
        totalItems={total}
        hasApiKey={hasApiKey}
      />

      {/* Floating Status Notification */}
      {statusNotification && (
        <div className="fixed bottom-6 right-6 z-40 max-w-md animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-indigo-500/40 text-xs text-zinc-200 shadow-2xl flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
            <span>{statusNotification}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Daily Executive Briefing */}
        <ExecutiveBriefingCard
          briefing={briefing}
          onRefresh={handleRefreshBriefing}
          isLoading={isBriefingLoading}
        />

        {/* Filter & Search Bar */}
        <FilterBar
          view={view}
          onViewChange={(newView) => {
            setView(newView);
            setPage(1);
          }}
          selectedSource={selectedSource}
          onSourceChange={(s) => {
            setSelectedSource(s);
            setPage(1);
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={(c) => {
            setSelectedCategory(c);
            setPage(1);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Feed Cards Grid */}
        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  <div className="h-6 bg-zinc-800/80 rounded w-4/5" />
                  <div className="h-12 bg-zinc-800/40 rounded w-full" />
                </div>
                <div className="h-4 bg-zinc-800/50 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
            <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">
              {view === 'bookmarks'
                ? 'No bookmarked items yet'
                : 'No feed items found'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
              {view === 'bookmarks'
                ? 'Bookmark interesting stories or papers to save them for later.'
                : 'Try syncing feeds to pull the latest AI discussions, repos, and research papers.'}
            </p>
            {view !== 'bookmarks' && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="py-6 flex justify-center">
                <button
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchFeed(nextPage, true);
                  }}
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition"
                >
                  {isLoading ? 'Loading more...' : 'Load More Stories'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          fetchInitialData();
          fetchFeed(1, false);
        }}
      />
    </div>
  );
}
