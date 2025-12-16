
export enum TaskStatus {
  INBOX = 'inbox',
  NOW = 'now',
  NEXT = 'next',
  TODAY = 'today',
  WAITING = 'waiting',
  SCHEDULED = 'scheduled', // Hidden until startAt
  SOMEDAY = 'someday',
  DONE = 'done',
  ARCHIVED = 'archived'
}

export enum SnoozeReason {
  WAITING = 'Waiting',
  BLOCKED = 'Blocked',
  LATER = 'Later today',
  TOMORROW = 'Tomorrow',
  WEEK = 'Next Week',
  SOMEDAY = 'Someday'
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  projectId?: string;
  personId?: string; // For @Person parsing
  startAt?: number; // Timestamp for resurfacing
  dueAt?: number;
  estimateMinutes?: number;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  snoozeReason?: SnoozeReason;
  notesMd?: string;
  links?: string[]; // Simplified for v0.1
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  color?: string; // hex
  pinned: boolean;
}

// UI State Types
export type ViewMode = 'spotlight' | 'inbox' | 'waiting' | 'week' | 'someday';

// --- Focus Engine Types ---

export type FocusPhase = 'idle' | 'focus' | 'break';

export interface FocusPreset {
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  type: 'focus' | 'break';
  presetLabel: string;
  plannedMinutes: number;
  startedAt: number;
  endedAt: number;
  completed: boolean; // true if timer finished naturally, false if stopped early
  outcome?: {
    finishedTask: boolean | null;
    reason?: string; // 'interrupted' | 'blocked' | ...
    note?: string;
  };
}

export interface FocusState {
  phase: FocusPhase;
  activeTaskId: string | null;
  startTime: number | null; // epoch ms
  endTime: number | null;   // epoch ms
  preset: FocusPreset | null;
  isRitualOpen: 'start' | 'stop' | null;
  suggestedBreak?: boolean; // If true, show "Start Break" button prominently
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  selectedTaskId: string | null;
  currentView: ViewMode;
  showCommandPalette: boolean;
  compactMode: boolean;
  
  // Focus Engine
  focus: FocusState;
  focusSessions: FocusSession[];
}
