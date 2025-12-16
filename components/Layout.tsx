import React from 'react';
import { useStore } from '../store';
import { Coffee, Zap } from 'lucide-react';

interface LayoutProps {
  topBar: React.ReactNode;
  leftRail: React.ReactNode;
  centerPanel: React.ReactNode;
  inspector: React.ReactNode;
  statusBar: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ topBar, leftRail, centerPanel, inspector, statusBar }) => {
  const { focus } = useStore();

  // Simple global timer for status bar
  const [globalTimer, setGlobalTimer] = React.useState("");

  React.useEffect(() => {
     if (focus.phase !== 'idle' && focus.endTime) {
         const tick = () => {
             const diff = focus.endTime! - Date.now();
             if (diff <= 0) {
                 setGlobalTimer("00:00");
                 return;
             }
             const m = Math.floor(diff / 60000);
             const s = Math.floor((diff % 60000) / 1000);
             setGlobalTimer(`${m}:${s.toString().padStart(2, '0')}`);
         };
         tick();
         const interval = setInterval(tick, 1000);
         return () => clearInterval(interval);
     } else {
         setGlobalTimer("");
     }
  }, [focus.phase, focus.endTime]);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg0 text-text0 overflow-hidden font-sans text-xs leading-none">
      {/* Top Bar */}
      <div className="h-[22px] shrink-0 border-b border-border0 bg-bg1 flex items-center z-20">
        {topBar}
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Rail */}
        <div className="w-[150px] shrink-0 border-r border-border0 bg-bg1 flex flex-col py-1 overflow-y-auto">
          {leftRail}
        </div>

        {/* Center Panel */}
        <div className="flex-1 bg-bg0 flex flex-col relative min-w-[300px] overflow-hidden">
          {centerPanel}
        </div>

        {/* Inspector (Right) */}
        <div className="w-[200px] shrink-0 border-l border-border0 bg-bg1 flex flex-col overflow-hidden">
          {inspector}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-[18px] shrink-0 border-t border-border0 bg-bg1 flex items-center px-2 z-20 text-[10px] text-text2 font-mono gap-2">
        {statusBar}
        
        {/* Global Timer Indicator */}
        {globalTimer && (
            <div className={`ml-auto flex items-center gap-1.5 px-2 font-bold ${focus.phase === 'break' ? 'text-warning' : 'text-accent'}`}>
                {focus.phase === 'break' ? <Coffee size={10} /> : <Zap size={10} className="animate-pulse" />}
                {focus.phase === 'break' ? 'BREAK' : 'FOCUS'} {globalTimer}
            </div>
        )}
      </div>
    </div>
  );
};
