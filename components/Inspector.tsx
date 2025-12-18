import React, { useState } from 'react';
import { useStore } from '../store';
import { TaskStatus, SnoozeReason } from '../types';
import { Clock, Trash2, ChevronDown } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { ProjectPicker } from './ProjectPicker';

export const Inspector: React.FC = () => {
  const { selectedTaskId, tasks, projects, updateTask, deleteTask, snoozeTask } = useStore();
  const task = tasks.find(t => t.id === selectedTaskId);
  
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-text2 text-xs italic">
        Select a task
      </div>
    );
  }

  const handleSnooze = (reason: SnoozeReason, hours: number) => {
    const time = Date.now() + (hours * 3600000);
    snoozeTask(task.id, reason, time);
    setSnoozeOpen(false);
  };

  const priorities: ('P0' | 'P1' | 'P2' | 'P3')[] = ['P0', 'P1', 'P2', 'P3'];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-1 gap-1 font-sans text-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between h-[17px] px-1">
        <div className="flex items-center gap-1">
           <div className={`w-1.5 h-1.5 rounded-full ${task.status === TaskStatus.NOW ? 'bg-success' : 'bg-text2'}`}></div>
           <span className="font-medium uppercase text-text1 text-[10px]">{task.status}</span>
        </div>
        <div className="flex gap-1">
            <button onClick={() => setSnoozeOpen(!snoozeOpen)} className="text-text2 hover:text-accent p-0.5"><Clock size={10} /></button>
            <button onClick={() => deleteTask(task.id)} className="text-text2 hover:text-danger p-0.5"><Trash2 size={10} /></button>
        </div>
      </div>

      {snoozeOpen && (
          <div className="bg-bg2 border border-border1 rounded-[2px] p-1 flex flex-col gap-0.5 text-[10px] mb-1">
             <button className="text-left px-1 hover:bg-bg1" onClick={() => handleSnooze(SnoozeReason.LATER, 3)}>Later (3h)</button>
             <button className="text-left px-1 hover:bg-bg1" onClick={() => handleSnooze(SnoozeReason.TOMORROW, 24)}>Tomorrow</button>
          </div>
      )}

      {/* Title */}
      <div className="px-1">
        <textarea 
          value={task.title}
          onChange={(e) => updateTask(task.id, { title: e.target.value })}
          className="w-full bg-bg0 border-b border-transparent focus:border-border1 rounded-[1px] p-0 text-xs font-semibold text-text0 resize-none outline-none leading-tight"
          rows={2}
        />
      </div>

      {/* Grid Fields */}
      <div className="grid grid-cols-[40px_1fr] gap-y-1 gap-x-1 px-1 mt-1">
         <label className="text-text2 text-[10px] pt-0.5">Project</label>
         <div className="h-[15px]">
             <ProjectPicker 
                value={task.projectId} 
                onChange={(val) => updateTask(task.id, { projectId: val })}
                projects={projects}
                placeholder="None"
             />
         </div>

         <label className="text-text2 text-[10px] pt-0.5">Priority</label>
         <div className="h-[15px] relative group">
            <select
                value={task.priority || 'P3'}
                onChange={(e) => updateTask(task.id, { priority: e.target.value as any })}
                className="w-full bg-transparent border-b border-transparent hover:border-border1 text-text1 outline-none appearance-none cursor-pointer h-full text-[11px]"
            >
                {priorities.map(p => (
                    <option key={p} value={p} className="bg-bg1">{p}</option>
                ))}
            </select>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text2 opacity-50 group-hover:opacity-100">
                <ChevronDown size={8} />
            </div>
         </div>

         <label className="text-text2 text-[10px] pt-0.5">Due</label>
         <div className="h-[15px]">
            <DateTimePicker 
                value={task.dueAt} 
                onChange={(val) => updateTask(task.id, { dueAt: val })} 
                placeholder="Set due date..."
            />
         </div>

         <label className="text-text2 text-[10px] pt-0.5">Start</label>
         <div className="h-[15px]">
            <DateTimePicker 
                value={task.startAt} 
                onChange={(val) => updateTask(task.id, { startAt: val })} 
                placeholder="Set start date..."
            />
         </div>

         <label className="text-text2 text-[10px] pt-0.5">Est</label>
         <input 
            value={task.estimateMinutes || ''} 
            onChange={(e) => updateTask(task.id, { estimateMinutes: parseInt(e.target.value) || undefined })}
            className="bg-transparent text-text1 outline-none h-[15px] border-b border-transparent hover:border-border1 focus:border-accent text-[11px]"
            placeholder="min"
            type="number"
         />

         <label className="text-text2 text-[10px] pt-0.5">Who</label>
         <input 
            value={task.personId || ''} 
            onChange={(e) => updateTask(task.id, { personId: e.target.value })}
            className="bg-transparent text-info outline-none h-[15px] border-b border-transparent hover:border-border1 focus:border-accent text-[11px]"
            placeholder="@"
         />
      </div>

      {/* Notes */}
      <div className="px-1 mt-2 flex-1 flex flex-col">
         <div className="text-text2 mb-0.5 text-[10px]">NOTES</div>
         <textarea 
           value={task.notesMd || ''}
           onChange={(e) => updateTask(task.id, { notesMd: e.target.value })}
           className="w-full flex-1 bg-bg0 border border-border1 rounded-[2px] p-1 text-[11px] font-mono text-text1 resize-none outline-none leading-normal"
           placeholder="Markdown..."
         />
      </div>

      {/* Links / Footer Actions */}
      <div className="border-t border-border0 mt-1 pt-1 flex gap-1 px-1">
          <button onClick={() => handleSnooze(SnoozeReason.TOMORROW, 24)} className="bg-bg2 border border-border1 rounded-[2px] px-1 h-[16px] text-[10px] text-text1 hover:text-text0">S Snooze</button>
          <button className="bg-bg2 border border-border1 rounded-[2px] px-1 h-[16px] text-[10px] text-text1 hover:text-text0">W Wait</button>
      </div>

    </div>
  );
};