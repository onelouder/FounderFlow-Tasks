import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';

interface ProjectPickerProps {
    value?: string;
    onChange: (val: string) => void;
    projects: Project[];
    placeholder?: string;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({ value, onChange, projects, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync internal state with external value changes (e.g. from switching tasks)
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Close dropdown on click outside
    useEffect(() => {
         const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setInputValue(newVal);
        onChange(newVal);
        setIsOpen(true);
    };

    const handleSelect = (projectName: string) => {
        setInputValue(projectName);
        onChange(projectName);
        setIsOpen(false);
    };

    // Filter logic: Match name, show existing projects that partially match input
    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                className="w-full bg-transparent text-info outline-none h-[15px] border-b border-transparent hover:border-border1 focus:border-accent text-[11px] placeholder-text2/50"
                placeholder={placeholder}
            />
            
            {isOpen && filteredProjects.length > 0 && (
                 <div className="absolute top-full left-0 z-50 mt-1 min-w-[140px] max-w-[200px] bg-bg1 border border-border1 rounded-[2px] shadow-xl max-h-[150px] overflow-y-auto">
                    {filteredProjects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSelect(p.name)}
                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-bg2 group"
                        >
                            <div className="w-1.5 h-1.5 rounded-[1px] shrink-0" style={{ backgroundColor: p.color || '#666' }}></div>
                            <span className="text-[10px] text-text1 group-hover:text-text0 truncate">{p.name}</span>
                        </button>
                    ))}
                 </div>
            )}
        </div>
    );
};