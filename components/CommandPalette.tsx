import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Search, Monitor, Inbox, Calendar, Clock } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { showCommandPalette, toggleCommandPalette, setView, setSelectTask, moveToSpotlight, selectedTaskId, toggleCompact } = useStore();
  const [query, setQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && showCommandPalette) {
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleDown);
    return () => window.removeEventListener('keydown', handleDown);
  }, [showCommandPalette]);

  if (!showCommandPalette) return null;

  const actions = [
    { label: 'Go to Spotlight', icon: <Monitor size={14} />, action: () => setView('spotlight') },
    { label: 'Go to Inbox', icon: <Inbox size={14} />, action: () => setView('inbox') },
    { label: 'Go to Waiting', icon: <Clock size={14} />, action: () => setView('waiting') },
    { label: 'Set Selected as NOW', icon: <Monitor size={14} />, action: () => selectedTaskId && moveToSpotlight(selectedTaskId, 'now') },
    { label: 'Toggle Compact Mode', icon: <Search size={14} />, action: () => toggleCompact() },
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div className="w-full max-w-lg bg-bg1 border border-border1 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center px-3 border-b border-border0">
          <Search size={16} className="text-text2" />
          <input 
            autoFocus
            className="flex-1 bg-transparent border-none py-3 px-3 text-sm text-text0 focus:outline-none placeholder:text-text2"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((item, i) => (
            <button 
              key={i}
              onClick={() => { item.action(); toggleCommandPalette(); }}
              className="w-full text-left px-3 py-2 text-sm text-text1 hover:bg-accent/10 hover:text-accent flex items-center gap-2"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {filtered.length === 0 && <div className="p-3 text-xs text-text2">No results</div>}
        </div>
        <div className="bg-bg2 border-t border-border0 px-3 py-1 text-[10px] text-text2 flex justify-between">
           <span>Select ↵</span>
           <span>Close Esc</span>
        </div>
      </div>
    </div>
  );
};