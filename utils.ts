
import { format, isToday, isTomorrow, isThisYear } from 'date-fns';
import { TaskStatus } from './types';
import * as chrono from 'chrono-node';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const formatRelativeDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) return format(date, 'h:mm a');
  if (isTomorrow(date)) return 'Tmrw ' + format(date, 'h a');
  
  if (isThisYear(date)) {
      return format(date, 'MMM d' + (date.getHours() !== 9 && date.getHours() !== 0 ? ', h a' : ''));
  }
  return format(date, 'MMM d yyyy');
};

// --- Audio Utility ---
export const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const t = ctx.currentTime;
        
        // Create a nice "Glass Ping" sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Bright sine wave with a pitch drop for "ping" effect
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t); // A5
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.1); 
        
        // Envelope: Fast attack, long decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        
        osc.start(t);
        osc.stop(t + 1.5);
    } catch (e) {
        // Ignore audio errors (e.g. if context is blocked)
        console.error("Failed to play notification sound", e);
    }
};

// --- Advanced Parsing Logic ---

export interface CaptureSegment {
    text: string;
    type: 'text' | 'due' | 'start' | 'project' | 'person' | 'estimate' | 'priority';
}

export interface ParsedCapture {
    title: string;
    dueAt?: number;
    startAt?: number;
    projectId?: string;
    personId?: string;
    estimateMinutes?: number;
    priority?: 'P0' | 'P1' | 'P2' | 'P3';
    segments: CaptureSegment[];
}

export const parseCaptureText = (text: string): ParsedCapture => {
    const segments: CaptureSegment[] = [];
    const usedRanges: { start: number, end: number, type: CaptureSegment['type'] }[] = [];

    let projectId: string | undefined;
    let personId: string | undefined;
    let estimateMinutes: number | undefined;
    let dueAt: number | undefined;
    let startAt: number | undefined;
    let priority: 'P0' | 'P1' | 'P2' | 'P3' | undefined;

    // 1. Regex Extraction for strict tokens (p:, @, est:, !p)
    const regexRules = [
        { regex: /\bp:(\w+)/g, type: 'project' as const, handler: (m: string) => projectId = m },
        { regex: /@(\w+)/g, type: 'person' as const, handler: (m: string) => personId = m },
        { regex: /\best:(\d+)/g, type: 'estimate' as const, handler: (m: string) => estimateMinutes = parseInt(m) },
        { regex: /\b(\d+)m\b/g, type: 'estimate' as const, handler: (m: string) => estimateMinutes = parseInt(m) },
        { regex: /!(p[0-3])/gi, type: 'priority' as const, handler: (m: string) => priority = m.toUpperCase() as any },
        // Strict due/start tokens
        { regex: /\bdue:([^\s]+)/g, type: 'due' as const, handler: () => {} }, 
        { regex: /\bstart:([^\s]+)/g, type: 'start' as const, handler: () => {} },
    ];

    // Helper to check overlap
    const isOverlapping = (start: number, end: number) => {
        return usedRanges.some(r => (start < r.end && end > r.start));
    };

    // Run Regex
    regexRules.forEach(rule => {
        let match;
        while ((match = rule.regex.exec(text)) !== null) {
            if (!isOverlapping(match.index, match.index + match[0].length)) {
                usedRanges.push({ start: match.index, end: match.index + match[0].length, type: rule.type });
                if (rule.type !== 'due' && rule.type !== 'start') {
                    rule.handler(match[1]);
                }
            }
        }
    });

    // 2. Chrono Parsing for Dates (Natural Language)
    let maskedText = text.split('').map((c, i) => isOverlapping(i, i + 1) ? ' ' : c).join('');

    const chronoResults = chrono.parse(maskedText, new Date(), { forwardDate: true });
    
    chronoResults.forEach(result => {
        const start = result.index;
        const end = result.index + result.text.length;
        
        const prefixWindow = text.substring(Math.max(0, start - 6), start).toLowerCase();
        
        let type: 'due' | 'start' = 'due'; 
        if (prefixWindow.match(/(start:|s:|on )/)) {
            type = 'start';
        } else if (prefixWindow.match(/(due:|by )/)) {
            type = 'due';
        }

        let actualStart = start;
        if (text.substring(start - 3, start).toLowerCase() === 'by ') {
             actualStart = start - 3;
        }

        const strictPrefix = text.substring(Math.max(0, start - 4), start); // "due:"
        if (strictPrefix.toLowerCase().endsWith('due:')) actualStart = start - 4;
        const strictStartPrefix = text.substring(Math.max(0, start - 6), start); // "start:"
        if (strictStartPrefix.toLowerCase().endsWith('start:')) {
            actualStart = start - 6;
            type = 'start';
        }

        if (!isOverlapping(actualStart, end)) {
            usedRanges.push({ start: actualStart, end, type });
            
            const date = result.start.date();
            if (!result.start.isCertain('hour')) {
                date.setHours(17, 0, 0, 0); // Default Due to 5 PM
                if (type === 'start') {
                    date.setHours(9, 0, 0, 0); // Default Start to 9 AM
                }
            }

            if (type === 'due' && !dueAt) dueAt = date.getTime();
            else if (type === 'start' && !startAt) startAt = date.getTime();
            else if (!dueAt) dueAt = date.getTime(); // Fallback
        }
    });

    // 3. Construct Segments
    usedRanges.sort((a, b) => a.start - b.start);

    let currentIndex = 0;
    usedRanges.forEach(range => {
        if (range.start > currentIndex) {
            segments.push({ text: text.substring(currentIndex, range.start), type: 'text' });
        }
        segments.push({ text: text.substring(range.start, range.end), type: range.type });
        currentIndex = range.end;
    });
    if (currentIndex < text.length) {
        segments.push({ text: text.substring(currentIndex), type: 'text' });
    }

    // 4. Construct Clean Title
    const cleanTitle = segments
        .filter(s => s.type === 'text')
        .map(s => s.text)
        .join(' ')
        .replace(/\s+/g, ' ') 
        .trim();

    return {
        title: cleanTitle || text, 
        projectId,
        personId,
        estimateMinutes,
        dueAt,
        startAt,
        priority,
        segments
    };
};

export const getStatusLabel = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.NOW: return 'NOW';
    case TaskStatus.NEXT: return 'NEXT';
    case TaskStatus.TODAY: return 'TODAY';
    case TaskStatus.INBOX: return 'INBOX';
    case TaskStatus.WAITING: return 'WAITING';
    case TaskStatus.SCHEDULED: return 'SCHEDULED';
    case TaskStatus.SOMEDAY: return 'SOMEDAY';
    default: return status.toUpperCase();
  }
};
