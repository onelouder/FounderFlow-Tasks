import React from 'react';
import { Task, TaskStatus } from '../types';
import { useStore } from '../store';
import { formatRelativeDate } from '../utils';
import { FocusControls } from './FocusControls';

interface NowCardProps {
  task: Task;
}

export const NowCard: React.FC<NowCardProps> = ({ task }) => {
  const { setSelectTask, updateTask } = useStore();

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { 
      status: TaskStatus.DONE,
      completedAt: Date.now()
    });
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { status: TaskStatus.NEXT });
  };

  return (
    <div className="mb-1">
        {/* Main Row */}
        <div 
          onClick={() => setSelectTask(task.id)}
          className="flex items-center h-[17px] px-1 gap-1.5 cursor-pointer bg-success/10 border-l-2 border-success"
        >
          <span className="text-success text-[10px]">▶</span>
          <span className="flex-1 truncate text-xs font-medium text-text0 leading-none">
              {task.title}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-text2 shrink-0">
             {task.projectId && <span className="text-info">#{task.projectId}</span>}
             {task.estimateMinutes && <span>{task.estimateMinutes}m</span>}
             {task.dueAt && <span className="text-warning">{formatRelativeDate(task.dueAt)}</span>}
          </div>
        </div>

        {/* Controls Row (Sub-line) */}
        <div className="flex items-center h-[17px] px-1 pl-4 gap-2">
            
            {/* Focus Engine Controls */}
            <FocusControls task={task} />

            <div className="w-[1px] h-[10px] bg-border1 mx-1"></div>

            <button 
                onClick={handleSkip}
                className="text-text2 hover:text-text1 text-[10px]"
            >
                →Skip
            </button>
            <button 
                onClick={handleComplete}
                className="text-success hover:text-green-400 text-[10px] ml-1"
            >
                ✓ Done
            </button>
            {task.notesMd && <span className="ml-auto text-info text-[10px] truncate max-w-[100px]">"{task.notesMd.slice(0, 15)}..."</span>}
        </div>
    </div>
  );
};