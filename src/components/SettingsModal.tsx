'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Sliders, Rss, Plus, Trash2, Check, Sparkles, ExternalLink } from 'lucide-react';
import { SourceConfig, UserSettings } from '@/types/feed';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'sources'>('ai');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [interestsPrompt, setInterestsPrompt] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New source form
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'rss' | 'reddit' | 'arxiv'>('rss');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setInterestsPrompt(data.settings.user_interests_prompt || '');
        setModel(data.settings.gemini_model || 'gemini-2.5-flash');
        setHasApiKey(data.settings.has_api_key);
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveAISettings = async () => {
    setIsSaving(true);
    try {
      const body: any = {
        user_interests_prompt: interestsPrompt,
        gemini_model: model,
      };
      if (apiKey.trim()) {
        body.gemini_api_key = apiKey.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (apiKey.trim()) setHasApiKey(true);
        setApiKey('');
        setTimeout(() => setSaveSuccess(false), 2000);
        onSettingsSaved();
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSource = async (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: nextEnabled } : s))
    );

    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, enabled: nextEnabled }),
      });
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: newSourceName.trim(),
          type: newSourceType,
          url_or_query: newSourceUrl.trim(),
          enabled: true,
        }),
      });

      if (res.ok) {
        setNewSourceName('');
        setNewSourceUrl('');
        loadSettings();
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-zinc-100">AI Feed Settings & Sources</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'ai'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Curation & Gemini</span>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sources'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>Manage Sources ({sources.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'ai' ? (
            <div className="space-y-5">
              {/* Gemini API Key */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Gemini API Key
                  </span>
                  {hasApiKey && (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      ✓ Configured
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder={hasApiKey ? '•••••••••••••••• (Leave blank to keep existing)' : 'AIzaSy...'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Required for automated batch AI summarization, &quot;Why it matters&quot; takeaways, and daily briefings. Get one free at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>

              {/* Gemini Model Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Gemini Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Fast, Low Latency, State of the Art - Recommended)</option>
                  <option value="gemini-3.8-pro">gemini-3.8-pro (Deep Reasoning & Analysis)</option>
                </select>
              </div>

              {/* Personal Interests Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Your Personal Interest Profile (Prompt)
                  </label>
                  <span className="text-[11px] text-zinc-500">Guides ranking & relevance scores</span>
                </div>
                <textarea
                  rows={4}
                  value={interestsPrompt}
                  onChange={(e) => setInterestsPrompt(e.target.value)}
                  className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  placeholder="Describe the topics you care most about..."
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-zinc-500 self-center mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setInterestsPrompt(
                        'Prioritize coding agents, autonomous SWE workflows, MCP servers, and LLM dev tooling. Downrank crypto and marketing launches.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    Coding Agents
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInterestsPrompt(
                        'Prioritize open-weights models (DeepSeek, LLaMA, Qwen, Mistral), local inference (llama.cpp, vLLM, Ollama), and quantization breakthroughs.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    Open Models & Local
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInterestsPrompt(
                        'Prioritize breakthrough ArXiv research papers on reasoning models, transformer architectures, attention mechanisms, and scaling laws with reproducible code.'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    Frontier Research
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAISettings}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add New Source Form */}
              <form onSubmit={handleAddSource} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Custom Feed Source</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Source Name (e.g. Karpathy Blog)"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as any)}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="rss">RSS / Atom / YouTube Feed</option>
                    <option value="reddit">Reddit Subreddit</option>
                    <option value="arxiv">ArXiv Category Query</option>
                  </select>
                  <input
                    type="text"
                    placeholder={
                      newSourceType === 'reddit'
                        ? 'Subreddit name (e.g. artificial)'
                        : newSourceType === 'arxiv'
                        ? 'Query (e.g. cat:cs.RO)'
                        : 'https://example.com/rss.xml'
                    }
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition"
                  >
                    Add Source
                  </button>
                </div>
              </form>

              {/* Source List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Configured Sources ({sources.length})
                </h3>

                <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-200 truncate">
                            {source.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {source.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate font-mono">
                          {source.url_or_query}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleSource(source.id, source.enabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            source.enabled ? 'bg-indigo-600' : 'bg-zinc-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              source.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Delete for custom sources */}
                        {source.id.startsWith('custom_') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSource(source.id)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 transition"
                            title="Delete custom source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
