import React, { useEffect } from 'react';
import { useStore } from './store';
import { seedDatabase } from './db';
import { Layout } from './components/Layout';
import { CaptureBar } from './components/CaptureBar';
import { Inspector } from './components/Inspector';
import { TaskRow } from './components/TaskRow';
import { NowCard } from './components/NowCard';
import { CommandPalette } from './components/CommandPalette';
import { FocusRitualModal } from './components/FocusRitualModal';
import { TaskStatus } from './types';
import { Monitor, Inbox, Clock, Calendar, Archive, Layers } from 'lucide-react';

export default function App() {
  const { 
    init, tasks, projects, currentView, setView, compactMode, 
    checkResurfacing, toggleCommandPalette, selectedTaskId, snoozeTask,
    checkTimer, toggleFocusRitual
  } = useStore();

  useEffect(() => {
    seedDatabase().then(() => init());
    const interval = setInterval(() => {
        checkResurfacing();
        checkTimer(); // Check focus timer
    }, 1000); // 1s tick for logic (display is faster)
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
            return;
        }
        
        if (e.key === 's' && selectedTaskId) {
             snoozeTask(selectedTaskId, 'Tomorrow' as any, Date.now() + 86400000);
        }
        
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFocusRitual();
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedTaskId]);

  // Derived State
  const nowTask = tasks.find(t => t.status === TaskStatus.NOW);
  const nextTasks = tasks.filter(t => t.status === TaskStatus.NEXT).sort((a,b) => (a.priority || 'P3').localeCompare(b.priority || 'P3'));
  const todayTasks = tasks.filter(t => t.status === TaskStatus.TODAY);
  const inboxTasks = tasks.filter(t => t.status === TaskStatus.INBOX).sort((a,b) => b.createdAt - a.createdAt);
  const waitingTasks = tasks.filter(t => t.status === TaskStatus.WAITING || t.status === TaskStatus.SCHEDULED);
  const weekTasks = tasks.filter(t => t.dueAt && t.dueAt <= (Date.now() + 86400000 * 7));
  const somedayTasks = tasks.filter(t => t.status === TaskStatus.SOMEDAY);
  
  const resurfacingCount = tasks.filter(t => t.status === TaskStatus.SCHEDULED && t.startAt && t.startAt < (Date.now() + 86400000)).length;

  // View Logic
  const renderCenter = () => {
    if (currentView === 'spotlight') {
      return (
        <div className="flex flex-col h-full overflow-y-auto py-1 px-1">
          {/* NOW */}
          <div className="h-[17px] flex items-center px-1 text-success text-[11px]">
             NOW <span className="ml-1 bg-success text-bg0 px-1 rounded-[2px] font-bold text-[10px]">1</span>
          </div>
          {nowTask ? (
             <NowCard task={nowTask} />
          ) : (
             <div className="text-text2 italic text-[11px] px-4 py-2 opacity-50">No focus task</div>
          )}

          {/* NEXT */}
          <div className="h-[17px] flex items-center px-1 text-text1 text-[11px] mt-1">
             NEXT <span className="ml-auto text-text2 font-mono text-[10px]">≤3</span>
          </div>
          {nextTasks.length === 0 && <div className="text-text2 italic px-2 py-1 opacity-50 text-[10px]">Empty</div>}
          {nextTasks.map(t => <TaskRow key={t.id} task={t} />)}

          {/* TODAY */}
          <div className="h-[17px] flex items-center px-1 text-text1 text-[11px] mt-1">
             TODAY <span className="ml-auto text-text2 font-mono text-[10px]">≤5</span>
          </div>
          {todayTasks.map(t => <TaskRow key={t.id} task={t} />)}
          
          <div className="mt-auto border-t border-border0 text-[10px] font-mono text-text2 p-1">
             Resurface: <span className="text-warning">{resurfacingCount}</span>
          </div>
        </div>
      );
    }

    // List Views
    let listToRender = inboxTasks;
    let title = "INBOX";
    if (currentView === 'waiting') { listToRender = waitingTasks; title = "WAITING"; }
    if (currentView === 'week') { listToRender = weekTasks; title = "WEEK"; }
    if (currentView === 'someday') { listToRender = somedayTasks; title = "SOMEDAY"; }

    return (
        <div className="flex flex-col h-full overflow-hidden p-1">
             <div className="h-[17px] flex items-center justify-between px-1 text-text2 text-[11px] mb-1">
                {title} <span className="font-mono">{listToRender.length}</span>
             </div>
             <div className="overflow-y-auto flex-1">
                {listToRender.map(t => <TaskRow key={t.id} task={t} />)}
             </div>
        </div>
    );
  };

  return (
    <>
      <CommandPalette />
      <FocusRitualModal />
      <Layout
        topBar={
          <div className="flex w-full h-full text-[11px]">
            {/* Left Rail Header */}
            <div className="w-[150px] shrink-0 flex items-center px-2 border-r border-border0">
                <div className="font-bold text-text0 select-none flex items-center gap-1">
                    Flow
                </div>
            </div>

            {/* Center Panel Header (Capture Bar Centered Here) */}
            <div className="flex-1 flex items-center justify-center px-2">
                <CaptureBar />
            </div>

            {/* Inspector Header */}
            <div className="w-[200px] shrink-0 flex items-center justify-end px-2 border-l border-border0 gap-2">
                <button onClick={toggleCommandPalette} className="hover:text-text1 text-text2">
                    <kbd>⌘K</kbd>
                </button>
                <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
            </div>
          </div>
        }
        leftRail={
          <div className="flex flex-col h-full gap-0.5 text-xs font-medium">
             <div className="px-2 py-1 text-text2 text-[10px]">VIEWS</div>
             <button onClick={() => setView('spotlight')} className={`flex items-center gap-2 px-2 h-[17px] ${currentView === 'spotlight' ? 'text-accent bg-accent/10' : 'text-text1 hover:bg-bg2'}`}>
                <Monitor size={10} /> Spotlight
             </button>
             <button onClick={() => setView('inbox')} className={`flex items-center gap-2 px-2 h-[17px] ${currentView === 'inbox' ? 'text-accent bg-accent/10' : 'text-text1 hover:bg-bg2'}`}>
                <Inbox size={10} /> Inbox <span className="ml-auto font-mono text-[10px] text-text2">{inboxTasks.length}</span>
             </button>
             <button onClick={() => setView('waiting')} className={`flex items-center gap-2 px-2 h-[17px] ${currentView === 'waiting' ? 'text-accent bg-accent/10' : 'text-text1 hover:bg-bg2'}`}>
                <Clock size={10} /> Waiting <span className="ml-auto font-mono text-[10px] text-text2">{waitingTasks.length}</span>
             </button>
             <button onClick={() => setView('week')} className={`flex items-center gap-2 px-2 h-[17px] ${currentView === 'week' ? 'text-accent bg-accent/10' : 'text-text1 hover:bg-bg2'}`}>
                <Calendar size={10} /> This Week
             </button>
             <button onClick={() => setView('someday')} className={`flex items-center gap-2 px-2 h-[17px] ${currentView === 'someday' ? 'text-accent bg-accent/10' : 'text-text1 hover:bg-bg2'}`}>
                <Archive size={10} /> Someday
             </button>

             <div className="mt-2 px-2 text-text2 text-[10px]">PINNED</div>
             {projects.filter(p => p.pinned).map(p => (
                <button key={p.id} className="flex items-center gap-2 px-2 h-[17px] text-text1 hover:bg-bg2 hover:text-text0 text-left">
                    <span className="text-[10px] text-text2">▸</span>
                    <span className="w-1 h-1 rounded-[1px]" style={{ backgroundColor: p.color || '#555' }}></span>
                    {p.name}
                </button>
             ))}
          </div>
        }
        centerPanel={renderCenter()}
        inspector={<Inspector />}
        statusBar={
          <>
            <span>WIP <span className="text-success">{1 + nextTasks.length}/4</span></span>
            <span>·</span>
            <span>Inbox <span className="text-text1">{inboxTasks.length}</span></span>
            <div className="ml-auto flex gap-2 opacity-50">
               <span>F Focus</span>
               <span>↑↓ E S D P @ F</span>
            </div>
          </>
        }
      />
    </>
  );
}