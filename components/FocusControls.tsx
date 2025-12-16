import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { Play, Square, FastForward, Coffee } from 'lucide-react';
import { Task } from '../types';

interface FocusControlsProps {
    task: Task;
}

export const FocusControls: React.FC<FocusControlsProps> = ({ task }) => {
    const { focus, startBreakSession, toggleFocusRitual, stopFocusEarly } = useStore();
    
    // Helper to calculate time string immediately
    const calculateTimeLeft = useCallback(() => {
        if (!focus.endTime) return "00:00";
        const diff = focus.endTime - Date.now();
        if (diff <= 0) return "00:00";
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }, [focus.endTime]);

    // Initialize with calculated time
    const [timeLeft, setTimeLeft] = useState<string>(calculateTimeLeft());
    
    // Check if this task is the active one.
    // If we are in 'break', we show the break timer on the NOW task regardless.
    const isFocusingThis = focus.phase === 'focus' && focus.activeTaskId === task.id;
    const isBreak = focus.phase === 'break';
    
    // Force timer display if we are in focus mode but checking the NOW task (fallback logic)
    const shouldShowTimer = (isFocusingThis || isBreak) && !!focus.endTime;

    // Timer Tick
    useEffect(() => {
        if (shouldShowTimer) {
            setTimeLeft(calculateTimeLeft());
            const interval = setInterval(() => {
                setTimeLeft(calculateTimeLeft());
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft("");
        }
    }, [shouldShowTimer, calculateTimeLeft]);

    const handleSkip = (e: React.MouseEvent) => {
        e.stopPropagation();
        stopFocusEarly();
    };

    const handleMainAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFocusRitual(); 
    };

    // If another task is focused, dim this control
    if (focus.phase === 'focus' && focus.activeTaskId !== task.id) {
        return (
            <div className="flex items-center gap-2 opacity-50">
                <span className="text-[10px] text-text2">Focusing other...</span>
            </div>
        );
    }

    if (shouldShowTimer) {
        return (
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleMainAction}
                    className={`
                        flex items-center gap-1.5 px-2 h-[16px] rounded-[2px] border transition-all min-w-[70px]
                        ${isBreak 
                            ? 'bg-warning/10 border-warning text-warning hover:bg-warning/20' 
                            : 'bg-accent/10 border-accent text-accent hover:bg-accent/20'}
                    `}
                >
                    {isBreak ? <Coffee size={10} /> : <div className={`w-1.5 h-1.5 rounded-full ${isBreak ? 'bg-warning' : 'bg-accent'} animate-pulse`} />}
                    <span className="text-[10px] font-mono font-bold leading-none pt-[1px]">
                        {isBreak ? 'Break' : 'Focus'} {timeLeft}
                    </span>
                </button>

                <button 
                    onClick={handleSkip}
                    title="Stop early"
                    className="text-text2 hover:text-text1 p-1"
                >
                    <Square size={8} fill="currentColor" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button 
                onClick={handleMainAction}
                className="bg-bg2 hover:bg-bg1 hover:text-text0 border border-border1 rounded-[2px] px-2 h-[16px] text-[10px] text-text1 flex items-center gap-1.5 transition-colors"
            >
                <Play size={8} fill="currentColor" />
                <span className="font-medium">{focus.suggestedBreak ? "Start Focus (Break suggested)" : "Start Focus"}</span>
            </button>
            
            {focus.suggestedBreak && (
                <button
                    onClick={(e) => { e.stopPropagation(); startBreakSession(5); }}
                    className="flex items-center gap-1 px-1.5 h-[16px] text-[10px] text-text2 hover:text-warning"
                    title="Take a 5m break"
                >
                    <Coffee size={10} />
                    Break
                </button>
            )}
        </div>
    );
};
