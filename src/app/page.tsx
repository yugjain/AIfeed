'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { ExecutiveBriefingCard } from '@/components/ExecutiveBriefingCard';
import { FilterBar } from '@/components/FilterBar';
import { FeedCard } from '@/components/FeedCard';
import { SettingsModal } from '@/components/SettingsModal';
import { FeedItem, ExecutiveBriefing } from '@/types/feed';
import { Sparkles, RefreshCw, Inbox, Cpu } from 'lucide-react';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Cached full store for static / GitHub Pages hosting
  const staticStoreRef = useRef<any>(null);

  // Filters & Views
  const [view, setView] = useState<'curated' | 'deep_tech' | 'latest' | 'bookmarks'>('curated');
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

  // Client-side filtering helper for static deployment
  const filterStaticItems = useCallback(
    (allRawItems: FeedItem[], currentPage = 1, append = false) => {
      let savedBookmarks: string[] = [];
      try {
        const stored = localStorage.getItem('aifeed_bookmarks');
        if (stored) savedBookmarks = JSON.parse(stored);
      } catch {}

      const filtered = allRawItems
        .map((item) => ({
          ...item,
          is_bookmarked: item.is_bookmarked || savedBookmarks.includes(item.id),
        }))
        .filter((item) => {
          if (view === 'bookmarks' && !item.is_bookmarked) return false;
          if (view === 'curated') {
            if (item.source_type === 'arxiv') return false;
            if (item.technicality_score && item.technicality_score >= 4) return false;
          }
          if (view === 'deep_tech') {
            const isDeep = item.source_type === 'arxiv' || item.source_type === 'github';
            const isHighTech = (item.technicality_score ?? 0) >= 4;
            const isTechCategory = item.ai_category === 'Research & Code' || item.ai_category === 'Developer Stacks';
            if (!isDeep && !isHighTech && !isTechCategory) return false;
          }
          if (selectedSource && selectedSource !== 'all' && item.source_type !== selectedSource) return false;
          if (selectedCategory && selectedCategory !== 'all' && item.ai_category !== selectedCategory) return false;

          if (debouncedSearch && debouncedSearch.trim()) {
            const q = debouncedSearch.trim().toLowerCase();
            const matchTitle = item.title.toLowerCase().includes(q);
            const matchSummary = item.raw_summary?.toLowerCase().includes(q) ?? false;
            const matchTldr = item.ai_tldr?.toLowerCase().includes(q) ?? false;
            const matchWhy = item.ai_why_it_matters?.toLowerCase().includes(q) ?? false;
            if (!matchTitle && !matchSummary && !matchTldr && !matchWhy) return false;
          }
          return true;
        });

      // Sort
      if (view === 'curated') {
        filtered.sort((a, b) => {
          const techBonusA = (5 - (a.technicality_score ?? 2)) * 10;
          const techBonusB = (5 - (b.technicality_score ?? 2)) * 10;
          const scoreA = (a.ai_relevance_score ?? 60) + techBonusA + Math.min(a.score, 300) * 0.1;
          const scoreB = (b.ai_relevance_score ?? 60) + techBonusB + Math.min(b.score, 300) * 0.1;
          if (Math.abs(scoreA - scoreB) > 5) return scoreB - scoreA;
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        });
      } else if (view === 'deep_tech') {
        filtered.sort((a, b) => {
          const scoreA = (a.ai_relevance_score ?? 50) + Math.min(a.score, 500);
          const scoreB = (b.ai_relevance_score ?? 50) + Math.min(b.score, 500);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        });
      } else {
        filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      }

      const limit = 30;
      const offset = (currentPage - 1) * limit;
      const paginated = filtered.slice(offset, offset + limit);

      if (append) {
        setItems((prev) => [...prev, ...paginated]);
      } else {
        setItems(paginated);
      }
      setTotal(filtered.length);
      setHasMore(paginated.length === limit && offset + limit < filtered.length);
      setIsLoading(false);
    },
    [view, selectedSource, selectedCategory, debouncedSearch]
  );

  // Fetch feed items
  const fetchFeed = useCallback(
    async (currentPage = 1, append = false) => {
      setIsLoading(true);

      // If we already loaded the static store or know we are static
      if (staticStoreRef.current) {
        filterStaticItems(staticStoreRef.current.items || [], currentPage, append);
        return;
      }

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
        if (!res.ok) throw new Error('API route unavailable');

        const data = await res.json();
        if (data.success) {
          if (append) {
            setItems((prev) => [...prev, ...data.data]);
          } else {
            setItems(data.data);
          }
          setTotal(data.total);
          setHasMore(data.data.length === 30 && currentPage * 30 < data.total);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fallback to static JSON file (works on GitHub Pages!)
        try {
          const staticUrl = `${BASE_PATH}/data/feed_store.json`;
          const staticRes = await fetch(staticUrl);
          if (staticRes.ok) {
            const storeData = await staticRes.json();
            staticStoreRef.current = storeData;
            if (storeData.settings?.executive_briefing && !briefing) {
              setBriefing(storeData.settings.executive_briefing);
            }
            filterStaticItems(storeData.items || [], currentPage, append);
            return;
          }
        } catch (staticErr) {
          console.error('Failed to load static feed store:', staticErr);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [view, selectedSource, selectedCategory, debouncedSearch, filterStaticItems, briefing]
  );

  // Fetch briefing & initial settings
  const fetchInitialData = async () => {
    try {
      const [settingsRes, briefingRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/briefing'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setHasApiKey(settingsData.settings.has_api_key);
        }
      }

      if (briefingRes.ok) {
        const briefingData = await briefingRes.json();
        if (briefingData.success && briefingData.briefing) {
          setBriefing(briefingData.briefing);
          return;
        }
      }
    } catch {}

    // Static fallback for briefing
    try {
      const staticUrl = `${BASE_PATH}/data/feed_store.json`;
      const staticRes = await fetch(staticUrl);
      if (staticRes.ok) {
        const storeData = await staticRes.json();
        staticStoreRef.current = storeData;
        if (storeData.settings?.executive_briefing) {
          setBriefing(storeData.settings.executive_briefing);
        }
      }
    } catch {}
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
    setStatusNotification('Fetching latest AI products, newsletters & discussions...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatusNotification(
            `Synced ${data.sync?.totalFetched || 0} items (${data.sync?.inserted || 0} new). Curated with Gemini!`
          );
          fetchFeed(1, false);
          fetchInitialData();
          setTimeout(() => setStatusNotification(null), 4000);
          return;
        }
      }
    } catch {}

    // If on static GitHub Pages
    setStatusNotification('Feed is refreshed via GitHub Actions automation.');
    setTimeout(() => setStatusNotification(null), 3000);
    setIsSyncing(false);
  };

  // Trigger Gemini AI Curation
  const handleCurate = async () => {
    setIsCurating(true);
    setStatusNotification('Curating feed for practical tools & plain-English summaries...');
    try {
      const res = await fetch('/api/sync?curateOnly=true', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatusNotification(`Curated ${data.curation?.processed || 0} items with Gemini!`);
          fetchFeed(1, false);
          setTimeout(() => setStatusNotification(null), 4000);
          setIsCurating(false);
          return;
        }
      }
    } catch {}

    setStatusNotification('AI curation active via scheduled intelligence pipeline.');
    setTimeout(() => setStatusNotification(null), 3000);
    setIsCurating(false);
  };

  // Generate / Refresh Daily Briefing
  const handleRefreshBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBriefing(data.briefing);
        }
      }
    } catch {}
    setIsBriefingLoading(false);
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_bookmarked: !item.is_bookmarked } : item
      )
    );

    // Save to localStorage for static GitHub Pages support
    try {
      let saved: string[] = [];
      const stored = localStorage.getItem('aifeed_bookmarks');
      if (stored) saved = JSON.parse(stored);
      if (saved.includes(id)) {
        saved = saved.filter((bId) => bId !== id);
      } else {
        saved.push(id);
      }
      localStorage.setItem('aifeed_bookmarks', JSON.stringify(saved));
    } catch {}

    // Try backend API if present
    try {
      await fetch('/api/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'bookmark' }),
      });
    } catch {}
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

      {/* Status Notification */}
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

        {/* View Description Pill */}
        <div className="mb-4 text-xs text-zinc-400 flex items-center justify-between">
          <span>
            {view === 'curated' && 'Showing top practical products, consumer apps, and real-world tools.'}
            {view === 'deep_tech' && 'Showing technical engineering stacks, low-level repos, and research papers.'}
            {view === 'latest' && 'Showing all feed items in chronological order.'}
            {view === 'bookmarks' && 'Showing your saved bookmarks.'}
          </span>
          <span className="text-zinc-500 font-mono">{total} stories</span>
        </div>

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
            {view === 'deep_tech' ? (
              <Cpu className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            ) : (
              <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            )}
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">
              {view === 'bookmarks'
                ? 'No bookmarked items yet'
                : view === 'deep_tech'
                ? 'No deep tech items found with current filters'
                : 'No practical feed items found'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
              {view === 'bookmarks'
                ? 'Bookmark interesting tools or stories to save them for later.'
                : 'Try syncing feeds or switching to "All Latest" to view newly fetched items.'}
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
