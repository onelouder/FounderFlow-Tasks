
import React from 'react';
import { Task, TaskStatus } from '../types';
import { formatRelativeDate } from '../utils';
import { useStore } from '../store';
import { Play, Square, CheckSquare, Clock, Hourglass } from 'lucide-react';

interface TaskRowProps {
  task: Task;
  compact?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task }) => {
  const { selectedTaskId, setSelectTask, moveToSpotlight, updateTask } = useStore();
  const isSelected = selectedTaskId === task.id;
  const isDone = task.status === TaskStatus.DONE;
  
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectTask(task.id);
  };

  const handleToggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { 
      status: isDone ? TaskStatus.INBOX : TaskStatus.DONE,
      completedAt: isDone ? undefined : Date.now()
    });
  };

  const handleSetNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveToSpotlight(task.id, 'now');
  };

  // Row Height Logic (Fixed at 17-19px for hyper density)
  const heightClass = 'h-[17px]';
  const bgClass = isSelected 
    ? 'bg-accent/10' 
    : 'hover:bg-bg1';

  const priorityColors = {
      'P0': 'bg-danger/20 text-danger border-danger/30',
      'P1': 'bg-warning/20 text-warning border-warning/30',
      'P2': 'bg-info/20 text-info border-info/30',
      'P3': 'bg-bg2 text-text2 border-border1',
  };

  return (
    <div 
      onClick={handleSelect}
      className={`
        group flex items-center px-1 gap-1.5 cursor-pointer 
        ${heightClass} ${bgClass} transition-colors duration-75
      `}
    >
      {/* Custom Checkbox/Icon */}
      <button 
        onClick={handleToggleDone}
        className={`shrink-0 flex items-center justify-center w-[10px] h-[10px] rounded-[2px] border ${isDone ? 'bg-text2 border-text2' : 'border-text2'} hover:border-text1 transition-colors`}
      >
        {isDone && <div className="w-[6px] h-[6px] bg-bg0" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden leading-none">
        {task.priority && task.priority !== 'P3' && (
            <span className={`text-[8px] font-bold shrink-0 px-1 py-0 rounded-[2px] border ${priorityColors[task.priority]}`}>
                {task.priority}
            </span>
        )}
        <span className={`truncate text-xs ${isDone ? 'text-text2 line-through' : 'text-text0'}`}>
          {task.title}
        </span>
        
        {/* Metadata Line */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text2 shrink-0 opacity-80">
          {task.projectId && <span className="text-info">#{task.projectId}</span>}
          {task.personId && <span className="text-warning">@{task.personId}</span>}
          {task.estimateMinutes && <span>{task.estimateMinutes}m</span>}
          {task.dueAt && (
             <span className="text-warning">
                {formatRelativeDate(task.dueAt)}
             </span>
          )}
        </div>
      </div>

      {/* Right Side Actions / Info */}
      <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono">
        {/* Hover Actions */}
        <div className="hidden group-hover:flex items-center gap-1">
            {task.status !== TaskStatus.NOW && !isDone && (
               <button onClick={handleSetNow} className="text-accent hover:text-white" title="Set NOW">
                 ▶
               </button>
            )}
        </div>
      </div>
    </div>
  );
};
