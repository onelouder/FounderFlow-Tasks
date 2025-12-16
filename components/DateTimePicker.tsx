import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatRelativeDate } from '../utils';

interface DateTimePickerProps {
    value?: number;
    onChange: (val?: number) => void;
    placeholder?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

    // View state
    const [viewDate, setViewDate] = useState(new Date());
    
    // Time string state (HH:mm)
    const [timeStr, setTimeStr] = useState("09:00");

    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setViewDate(d);
            setTimeStr(format(d, 'HH:mm'));
        } else {
            setViewDate(new Date());
        }
    }, [value, isOpen]);

    // Boundary detection
    useLayoutEffect(() => {
        if (isOpen && containerRef.current) {
             const rect = containerRef.current.getBoundingClientRect();
             const screenW = window.innerWidth;
             const screenH = window.innerHeight;
             
             // Dimensions of popover (approx)
             const WIDTH = 190; 
             const HEIGHT = 240; 

             const newStyle: React.CSSProperties = { position: 'absolute', zIndex: 50 };
             
             // X Axis Strategy:
             // If aligns left, right edge is rect.left + WIDTH.
             // If aligns right, left edge is rect.right - WIDTH.
             if (rect.left + WIDTH > screenW - 10) {
                 newStyle.right = 0;
                 newStyle.left = 'auto';
             } else {
                 newStyle.left = 0;
                 newStyle.right = 'auto';
             }

             // Y Axis Strategy
             const spaceBelow = screenH - rect.bottom;
             if (spaceBelow < HEIGHT) {
                 newStyle.bottom = '100%';
                 newStyle.top = 'auto';
                 newStyle.marginBottom = '2px';
             } else {
                 newStyle.top = '100%';
                 newStyle.bottom = 'auto';
                 newStyle.marginTop = '2px';
             }

             setPopoverStyle(newStyle);
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDayClick = (day: Date) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = setHours(setMinutes(day, minutes || 0), hours || 0);
        onChange(newDate.getTime());
        setIsOpen(false);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setTimeStr(newTime);
        if (value) {
            const [hours, minutes] = newTime.split(':').map(Number);
            const newDate = setHours(setMinutes(new Date(value), minutes), hours);
            onChange(newDate.getTime());
        }
    };

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(undefined);
        setIsOpen(false);
    };

    const monthStart = startOfMonth(viewDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(endOfMonth(monthStart));
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const today = new Date();

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Input */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between bg-transparent hover:bg-bg1 border-b border-transparent hover:border-border1 text-[11px] h-[15px] cursor-pointer group px-0.5 rounded-[1px]"
            >
                <div className={`flex items-center gap-1.5 ${value ? 'text-warning' : 'text-text2'}`}>
                    <Calendar size={10} className={value ? "text-warning" : "text-text2"}/>
                    <span className="truncate">
                        {value ? formatRelativeDate(value) : placeholder}
                    </span>
                </div>
                {value && (
                    <button onClick={clear} className="opacity-0 group-hover:opacity-100 text-text2 hover:text-danger">
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* Popover */}
            {isOpen && (
                <div 
                    style={popoverStyle}
                    className="bg-bg1 border border-border1 rounded-[2px] shadow-xl p-2 w-[190px] select-none"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-border0">
                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-0.5 hover:text-accent"><ChevronLeft size={12} /></button>
                        <span className="font-medium text-[10px] text-text0">{format(viewDate, 'MMMM yyyy')}</span>
                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-0.5 hover:text-accent"><ChevronRight size={12} /></button>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-1 text-center">
                        {weekDays.map(d => (
                            <span key={d} className="text-[9px] text-text2 font-mono">{d}</span>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {days.map(day => {
                            const isSelected = value && isSameDay(day, new Date(value));
                            const isCurrentMonth = isSameMonth(day, viewDate);
                            const isToday = isSameDay(day, today);

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        h-5 w-5 flex items-center justify-center rounded-[1px] text-[10px] border
                                        ${!isCurrentMonth ? 'text-text2/20' : 'text-text1'}
                                        ${isSelected 
                                            ? 'bg-accent text-white font-bold border-transparent' 
                                            : isToday 
                                                ? 'border-accent text-accent font-bold hover:bg-bg2' 
                                                : 'border-transparent hover:bg-bg2 hover:text-text0'
                                        }
                                    `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time Picker */}
                    <div className="mt-2 pt-1 border-t border-border0 flex items-center justify-between">
                         <div className="flex items-center gap-1 text-text2 text-[10px]">
                             <Clock size={10} />
                             <span>Time</span>
                         </div>
                         <input 
                            type="time" 
                            value={timeStr}
                            onChange={handleTimeChange}
                            className="bg-bg0 border border-border1 rounded-[2px] px-1 py-0 text-[10px] text-text0 w-[55px] text-center focus:outline-none focus:border-accent"
                         />
                    </div>
                    
                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                        <button onClick={() => {
                            const d = new Date(); d.setHours(9,0,0,0); d.setDate(d.getDate() + 1);
                            onChange(d.getTime());
                            setIsOpen(false);
                        }} className="bg-bg2 hover:bg-bg0 border border-border0 rounded-[1px] py-1 text-[9px] text-text1">Tmrw 9am</button>
                        <button onClick={() => {
                             const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9,0,0,0);
                             onChange(d.getTime());
                             setIsOpen(false);
                        }} className="bg-bg2 hover:bg-bg0 border border-border0 rounded-[1px] py-1 text-[9px] text-text1">Next Wk</button>
                    </div>
                </div>
            )}
        </div>
    );
};