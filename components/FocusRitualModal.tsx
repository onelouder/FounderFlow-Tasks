import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { FocusPreset } from '../types';
import { X, Check, Coffee, ChevronDown } from 'lucide-react';

const PRESETS: FocusPreset[] = [
    { label: 'Quick', focusMinutes: 15, breakMinutes: 3 },
    { label: 'Pomodoro', focusMinutes: 25, breakMinutes: 5 },
    { label: 'Deep', focusMinutes: 50, breakMinutes: 10 },
];

const REASONS = [
    'Interrupted', 'Blocked', 'Too big', 'Need info', 'Wrong task', 'Ran out of time'
];

export const FocusRitualModal: React.FC = () => {
    const { focus, tasks, startFocusSession, finalizeSession, cancelRitual } = useStore();
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[1]);
    const [overrideTaskId, setOverrideTaskId] = useState<string>('');
    
    // Calculate default task ID on mount/open
    const nowTask = tasks.find(t => t.status === 'now');
    const nextTask = tasks.find(t => t.status === 'next');
    const defaultTaskId = focus.activeTaskId || nowTask?.id || nextTask?.id || '';

    // Sync overrideTaskId when modal opens
    useEffect(() => {
        if (focus.isRitualOpen === 'start') {
            setOverrideTaskId(defaultTaskId);
        }
    }, [focus.isRitualOpen, defaultTaskId]);

    if (!focus.isRitualOpen) return null;

    // Determine the task to start on
    const activeTaskId = overrideTaskId || defaultTaskId;
    
    // Group tasks for the dropdown
    const spotlightTasks = tasks.filter(t => t.status === 'now' || t.status === 'next');
    const otherTasks = tasks.filter(t => t.status !== 'now' && t.status !== 'next' && t.status !== 'done' && t.status !== 'archived');

    // START RITUAL
    if (focus.isRitualOpen === 'start') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                <div className="w-[320px] bg-bg1 border border-border1 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 p-4">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-text1 text-xs font-medium uppercase tracking-wider">Start Focus Session</h3>
                        <button onClick={cancelRitual} className="text-text2 hover:text-text1"><X size={14}/></button>
                    </div>
                    
                    <div className="mb-5">
                        <label className="text-[10px] text-text2 font-bold mb-1.5 block">SELECT TASK</label>
                        <div className="relative group">
                            <select
                                value={activeTaskId}
                                onChange={(e) => setOverrideTaskId(e.target.value)}
                                className="w-full bg-bg0 border border-border1 rounded-[4px] px-3 py-2 text-xs text-text0 appearance-none focus:border-accent outline-none truncate pr-8 cursor-pointer hover:border-text2 transition-colors"
                            >
                                <option value="" disabled>Select a task...</option>
                                <optgroup label="Spotlight">
                                    {spotlightTasks.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.status.toUpperCase()}: {t.title}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Other">
                                    {otherTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text2">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-[10px] text-text2 font-bold mb-1.5 block">DURATION</label>
                        <div className="flex gap-2">
                            {PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => setSelectedPreset(p)}
                                    className={`
                                        flex-1 py-2 rounded-[4px] text-xs font-medium border transition-all
                                        ${selectedPreset.label === p.label 
                                            ? 'bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(78,161,255,0.1)]' 
                                            : 'bg-bg0 border-border1 text-text2 hover:border-text2 hover:text-text1'}
                                    `}
                                >
                                    {p.focusMinutes}m
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (activeTaskId) startFocusSession(activeTaskId, selectedPreset);
                        }}
                        disabled={!activeTaskId}
                        className="w-full bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-[4px] py-2.5 text-sm font-semibold hover:bg-accent/90 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        Start Focus Timer
                    </button>
                </div>
            </div>
        );
    }

    // STOP RITUAL
    if (focus.isRitualOpen === 'stop') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                <div className="w-[320px] bg-bg1 border border-border1 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 p-4">
                     <div className="flex justify-between items-start mb-2">
                        <h3 className="text-text1 text-xs font-medium uppercase tracking-wider">Session Complete</h3>
                        <button onClick={cancelRitual} className="text-text2 hover:text-text1"><X size={14}/></button>
                    </div>

                    <div className="text-sm text-text0 mb-4 font-medium text-center py-2">
                        Did you finish the task?
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <button
                            onClick={() => finalizeSession({ finishedTask: true })}
                            className="bg-success/10 border border-success text-success hover:bg-success/20 rounded-[4px] py-3 text-xs flex flex-col items-center gap-1 transition-colors"
                        >
                            <Check size={16} />
                            <span className="font-bold">Yes, Finished</span>
                        </button>
                        <button
                            onClick={() => finalizeSession({ finishedTask: false, reason: 'Not yet' })}
                            className="bg-bg2 border border-border1 text-text1 hover:bg-bg0 rounded-[4px] py-3 text-xs flex flex-col items-center gap-1 transition-colors"
                        >
                            <span className="font-mono text-lg leading-none">...</span>
                            <span>Not yet</span>
                        </button>
                    </div>

                    <div className="border-t border-border0 pt-3">
                        <div className="text-[10px] text-text2 mb-2 font-bold">OR LOG AN ISSUE</div>
                        <div className="flex flex-wrap gap-1.5">
                            {REASONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => finalizeSession({ finishedTask: false, reason: r })}
                                    className="px-2.5 py-1.5 bg-bg0 border border-border1 rounded-[4px] text-[10px] text-text2 hover:text-text0 hover:border-text2 transition-colors"
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
