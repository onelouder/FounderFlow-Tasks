import { create } from 'zustand';
import { Task, Project, AppState, TaskStatus, SnoozeReason, ViewMode, FocusState, FocusPreset, FocusSession, FocusPhase } from './types';
import { db } from './db';
import { generateId, playNotificationSound } from './utils';

// Defaults
const DEFAULT_PRESETS: FocusPreset[] = [
  { label: 'Quick', focusMinutes: 15, breakMinutes: 3 },
  { label: 'Pomodoro', focusMinutes: 25, breakMinutes: 5 },
  { label: 'Deep', focusMinutes: 50, breakMinutes: 10 },
];

const INITIAL_FOCUS_STATE: FocusState = {
  phase: 'idle',
  activeTaskId: null,
  startTime: null,
  endTime: null,
  preset: null,
  isRitualOpen: null,
  suggestedBreak: false,
};

interface Actions {
  init: () => Promise<void>;
  setSelectTask: (id: string | null) => void;
  setView: (view: ViewMode) => void;
  toggleCompact: () => void;
  toggleCommandPalette: () => void;
  
  // CRUD
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Logic
  moveToSpotlight: (id: string, target: 'now' | 'next' | 'today') => Promise<void>;
  snoozeTask: (id: string, reason: SnoozeReason, until: number) => Promise<void>;
  checkResurfacing: () => Promise<void>;

  // Focus Engine Actions
  toggleFocusRitual: () => void; // Triggered by 'F' shortcut
  startFocusSession: (taskId: string, preset: FocusPreset) => void;
  startBreakSession: (minutes: number) => void;
  stopFocusEarly: () => void; // Triggered by 'Stop' button -> Opens Stop Ritual
  completeFocusPhase: () => void; // Triggered by timer end -> Opens Stop Ritual
  completeBreakPhase: () => void; // Triggered by timer end
  
  // Ritual Actions
  finalizeSession: (outcome: FocusSession['outcome']) => Promise<void>;
  cancelRitual: () => void;
  checkTimer: () => void; // Call periodically
}

export const useStore = create<AppState & Actions>((set, get) => ({
  tasks: [],
  projects: [],
  selectedTaskId: null,
  currentView: 'spotlight',
  showCommandPalette: false,
  compactMode: false,
  
  focus: INITIAL_FOCUS_STATE,
  focusSessions: [],

  init: async () => {
    const tasks = await db.tasks.toArray();
    const projects = await db.projects.toArray();
    const focusSessions = await db.focusSessions.orderBy('startedAt').reverse().limit(50).toArray();

    // Recover Focus State from LocalStorage
    let focusState = INITIAL_FOCUS_STATE;
    const storedFocus = localStorage.getItem('founderflow_focus_state');
    if (storedFocus) {
      try {
        const parsed = JSON.parse(storedFocus);
        // Check if timer expired while closed
        if (parsed.phase !== 'idle' && parsed.endTime && parsed.endTime < Date.now()) {
            // Expired while away. 
            // If it was focus, go to stop ritual. If break, go to idle.
            if (parsed.phase === 'focus') {
                parsed.isRitualOpen = 'stop';
            } else {
                parsed.phase = 'idle';
                parsed.endTime = null;
                parsed.startTime = null;
            }
        }
        focusState = parsed;
      } catch (e) {
        console.error("Failed to recover focus state", e);
      }
    }

    set({ tasks, projects, focusSessions, focus: focusState });
  },

  setSelectTask: (id) => set({ selectedTaskId: id }),
  setView: (view) => set({ currentView: view }),
  toggleCompact: () => set(state => ({ compactMode: !state.compactMode })),
  toggleCommandPalette: () => set(state => ({ showCommandPalette: !state.showCommandPalette })),

  addTask: async (taskData) => {
    const newTask: Task = {
      id: generateId(),
      title: taskData.title || 'Untitled',
      status: taskData.status || TaskStatus.INBOX,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...taskData
    };
    await db.tasks.add(newTask);
    set(state => ({ tasks: [...state.tasks, newTask] }));
  },

  updateTask: async (id, updates) => {
    await db.tasks.update(id, { ...updates, updatedAt: Date.now() });
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)
    }));
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id), selectedTaskId: null }));
  },

  moveToSpotlight: async (id, target) => {
    const { tasks, updateTask, focus } = get();
    
    // Safety check for timer
    if (focus.phase === 'focus' && focus.activeTaskId !== id && target === 'now') {
       // We allow moving, but we need to know if we should stop the timer?
       // Actually, prompt requirement says: "Integrated into the NOW card". 
       // If we change NOW card, we should probably stop previous focus or switch it.
       // Current implementation: Alert user.
       if (!confirm("A focus session is running on another task. Stop it and switch?")) return;
       get().stopFocusEarly(); // Open ritual
       // We let the move happen, but the user has to handle the ritual
    }

    if (target === 'now') {
      const currentNow = tasks.filter(t => t.status === TaskStatus.NOW && t.id !== id);
      for (const t of currentNow) {
        await updateTask(t.id, { status: TaskStatus.NEXT });
      }
      await updateTask(id, { status: TaskStatus.NOW });
    } 
    else if (target === 'next') {
      const nextCount = tasks.filter(t => t.status === TaskStatus.NEXT).length;
      if (nextCount >= 3) {
        const sortedNext = tasks
            .filter(t => t.status === TaskStatus.NEXT)
            .sort((a, b) => a.updatedAt - b.updatedAt);
        if(sortedNext.length > 0) {
            await updateTask(sortedNext[0].id, { status: TaskStatus.TODAY });
        }
      }
      await updateTask(id, { status: TaskStatus.NEXT });
    }
    else if (target === 'today') {
       await updateTask(id, { status: TaskStatus.TODAY });
    }
  },

  snoozeTask: async (id, reason, until) => {
    const { updateTask } = get();
    await updateTask(id, {
      status: TaskStatus.SCHEDULED,
      snoozeReason: reason,
      startAt: until,
      selectedTaskId: null
    });
  },

  checkResurfacing: async () => {
    const { tasks, updateTask } = get();
    const now = Date.now();
    tasks.forEach(async (t) => {
      if (t.status === TaskStatus.SCHEDULED && t.startAt && t.startAt <= now) {
        await updateTask(t.id, { 
          status: TaskStatus.INBOX, 
          startAt: undefined, 
          snoozeReason: undefined 
        });
      }
    });
  },

  // --- FOCUS ACTIONS ---

  toggleFocusRitual: () => {
      const { focus } = get();
      if (focus.phase === 'idle') {
          // Open Start Ritual
          set({ focus: { ...focus, isRitualOpen: 'start' } });
      } else if (focus.phase === 'focus' || focus.phase === 'break') {
          // Open Stop Ritual (early stop)
          set({ focus: { ...focus, isRitualOpen: 'stop' } });
      }
      // If ritual is already open, maybe close it? (Esc handles that)
  },

  startFocusSession: async (taskId, preset) => {
      const { tasks, moveToSpotlight } = get();
      const now = Date.now();
      
      // Auto-promote to NOW if not already
      // This ensures the timer is visible in the NOW card
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== TaskStatus.NOW) {
          // We bypass the confirm dialog in moveToSpotlight by calling updateTask directly? 
          // No, better to use the logic but handle the case where we are *starting* the session.
          // moveToSpotlight has a check `if (focus.phase === 'focus' ...)`
          // Here focus.phase is 'idle' (usually), so moveToSpotlight will run fine.
          await moveToSpotlight(taskId, 'now');
      }

      const newFocus: FocusState = {
          phase: 'focus',
          activeTaskId: taskId,
          startTime: now,
          endTime: now + (preset.focusMinutes * 60000),
          preset: preset,
          isRitualOpen: null,
          suggestedBreak: false
      };
      set({ focus: newFocus });
      localStorage.setItem('founderflow_focus_state', JSON.stringify(newFocus));
  },

  startBreakSession: (minutes) => {
      const now = Date.now();
      const newFocus: FocusState = {
          ...get().focus,
          phase: 'break',
          startTime: now,
          endTime: now + (minutes * 60000),
          isRitualOpen: null,
          suggestedBreak: false
      };
      set({ focus: newFocus });
      localStorage.setItem('founderflow_focus_state', JSON.stringify(newFocus));
  },

  stopFocusEarly: () => {
      set(state => ({ focus: { ...state.focus, isRitualOpen: 'stop' } }));
  },

  completeFocusPhase: () => {
      // Timer hit 0 naturally
      set(state => ({ focus: { ...state.focus, isRitualOpen: 'stop' } }));
  },

  completeBreakPhase: () => {
     // Break done naturally
     const newFocus: FocusState = { ...INITIAL_FOCUS_STATE, suggestedBreak: false };
     set({ focus: newFocus });
     localStorage.setItem('founderflow_focus_state', JSON.stringify(newFocus));
     // Could add a notification here or a gentle sound
  },

  cancelRitual: () => {
      const { focus } = get();
      // If we cancelled the STOP ritual, we resume (keep running)
      // If we cancelled the START ritual, we go back to idle
      set({ focus: { ...focus, isRitualOpen: null } });
  },

  finalizeSession: async (outcome) => {
      const { focus, focusSessions, updateTask } = get();
      if (!focus.startTime || !focus.preset) return; // Should not happen

      const session: FocusSession = {
          id: generateId(),
          taskId: focus.activeTaskId || undefined,
          type: focus.phase === 'focus' ? 'focus' : 'break',
          presetLabel: focus.preset.label,
          plannedMinutes: focus.preset.focusMinutes,
          startedAt: focus.startTime,
          endedAt: Date.now(),
          completed: !outcome.reason, // If no reason, assume success? Or use logic. 
          // Actually, if we are in finalizeSession, we are stopping. 
          // 'completed' usually means "did the timer finish". 
          // But here we care about "Did I finish the task". 
          // Let's rely on `outcome` for task success. `completed` is for timer completeness.
          // For now, let's say if we are finalizing via ritual, we log the outcome.
          outcome
      };

      // Add to DB
      await db.focusSessions.add(session);
      
      // Update Task if finished
      if (outcome.finishedTask && focus.activeTaskId) {
          await updateTask(focus.activeTaskId, { status: TaskStatus.DONE, completedAt: Date.now() });
      }

      // Reset state
      const nextState: FocusState = {
          ...INITIAL_FOCUS_STATE,
          suggestedBreak: focus.phase === 'focus' // Suggest break if we just finished focus
      };
      
      set({ 
          focus: nextState, 
          focusSessions: [session, ...focusSessions] 
      });
      localStorage.setItem('founderflow_focus_state', JSON.stringify(nextState));
  },

  checkTimer: () => {
      const { focus, completeFocusPhase, completeBreakPhase } = get();
      if (focus.phase !== 'idle' && focus.endTime) {
          const remaining = focus.endTime - Date.now();
          if (remaining <= 0 && !focus.isRitualOpen) {
              playNotificationSound();
              if (focus.phase === 'focus') completeFocusPhase();
              else if (focus.phase === 'break') completeBreakPhase();
          }
      }
  }

}));