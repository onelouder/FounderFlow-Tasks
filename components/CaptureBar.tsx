import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { parseCaptureText, CaptureSegment } from '../utils';
import { TaskStatus } from '../types';

export const CaptureBar: React.FC = () => {
  const [text, setText] = useState('');
  const [segments, setSegments] = useState<CaptureSegment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTask } = useStore();

  useEffect(() => {
    // Live parse for preview
    const result = parseCaptureText(text);
    setSegments(result.segments);
  }, [text]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.metaKey && e.key === 'Enter') {
      e.preventDefault();
      await submit('next');
    } else if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      await submit('scheduled');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      await submit('inbox');
    } else if (e.key === 'Escape') {
      setText('');
      inputRef.current?.blur();
    }
  };

  const submit = async (targetStatus: 'inbox' | 'next' | 'scheduled') => {
    if (!text.trim()) return;

    const { title, projectId, personId, estimateMinutes, dueAt, startAt } = parseCaptureText(text);
    
    let taskData: any = {
      title,
      status: targetStatus === 'next' ? TaskStatus.NEXT : TaskStatus.INBOX,
      projectId,
      personId,
      estimateMinutes,
      dueAt,
      startAt
    };

    if (targetStatus === 'scheduled') {
        taskData.status = TaskStatus.SCHEDULED;
        if (!taskData.startAt) taskData.startAt = Date.now() + 86400000; 
    }

    if (taskData.startAt && taskData.startAt > Date.now() && targetStatus !== 'next') {
        taskData.status = TaskStatus.SCHEDULED;
    }

    await addTask(taskData);
    setText('');
  };

  // Global shortcut
  useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if (e.key === '/') {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobal);
    return () => window.removeEventListener('keydown', handleGlobal);
  }, []);

  return (
    <div className="w-full max-w-[480px] flex items-center">
      <div className="relative w-full group h-[16px] flex items-center bg-bg0 border border-border1 rounded-[2px] px-1">
        
        {/* Kbd hint */}
        <kbd className="mr-1">/</kbd>

        <div className="relative flex-1 h-full">
            {/* Syntax Highlight Backdrop */}
            <div className="absolute inset-0 flex items-center text-[11px] font-sans pointer-events-none whitespace-pre overflow-hidden">
                {text ? segments.map((seg, i) => {
                    let className = "text-transparent";
                    if (seg.type === 'project') className = "text-text2";
                    if (seg.type === 'person') className = "text-info"; 
                    if (seg.type === 'due') className = "text-warning";
                    if (seg.type === 'start') className = "text-text1 underline decoration-dotted";
                    if (seg.type === 'estimate') className = "text-accent";
                    return <span key={i} className={className}>{seg.text}</span>
                }) : <span className="text-text2">Capture...</span>}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-transparent text-[11px] text-text0 focus:outline-none relative z-10 placeholder-transparent"
              style={{ caretColor: '#fff' }} 
              spellCheck={false}
              autoComplete="off"
            />
        </div>
        
        {/* Right Hints */}
        <div className="flex items-center gap-1 ml-2 opacity-0 group-focus-within:opacity-100">
           <span className="text-[10px] text-text2 font-mono"><kbd>↵</kbd>Inbox</span>
           <span className="text-[10px] text-text2 font-mono"><kbd>⌘↵</kbd>Next</span>
        </div>

      </div>
    </div>
  );
};