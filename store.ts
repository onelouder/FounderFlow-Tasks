
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
  toggleProjectManager: () => void;
  toggleSound: () => void;
  
  // CRUD
  addTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Project Management
  createProject: (name: string, color: string) => Promise<void>;
  renameProject: (id: string, newName: string, newColor?: string) => Promise<void>;
  togglePinProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

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
  showProjectManager: false,
  compactMode: false,
  soundEnabled: true, // Default to on
  
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

    // Recover Sound Pref
    const storedSound = localStorage.getItem('founderflow_sound_enabled');
    const soundEnabled = storedSound ? JSON.parse(storedSound) : true;

    set({ tasks, projects, focusSessions, focus: focusState, soundEnabled });
  },

  setSelectTask: (id) => set({ selectedTaskId: id }),
  setView: (view) => set({ currentView: view }),
  toggleCompact: () => set(state => ({ compactMode: !state.compactMode })),
  toggleCommandPalette: () => set(state => ({ showCommandPalette: !state.showCommandPalette })),
  toggleProjectManager: () => set(state => ({ showProjectManager: !state.showProjectManager })),
  
  toggleSound: () => set(state => {
      const newVal = !state.soundEnabled;
      localStorage.setItem('founderflow_sound_enabled', JSON.stringify(newVal));
      return { soundEnabled: newVal };
  }),

  addTask: async (taskData) => {
    const now = Date.now();
    const status = (taskData.startAt && taskData.startAt > now) 
      ? TaskStatus.SCHEDULED 
      : (taskData.status || TaskStatus.INBOX);

    const newTask: Task = {
      id: generateId(),
      title: taskData.title || 'Untitled',
      status: status,
      createdAt: now,
      updatedAt: now,
      ...taskData
    };
    await db.tasks.add(newTask);
    set(state => ({ tasks: [...state.tasks, newTask] }));
  },

  updateTask: async (id, updates) => {
    const { tasks, focus, stopFocusEarly } = get();
    const existingTask = tasks.find(t => t.id === id);
    if (!existingTask) return;

    const now = Date.now();
    let finalUpdates = { ...updates, updatedAt: now };

    // Spotlight Logic Improvement: Auto-defer to SCHEDULED if startAt is in the future
    if (finalUpdates.startAt && finalUpdates.startAt > now) {
      finalUpdates.status = TaskStatus.SCHEDULED;
      
      // If we are deferring the current NOW task, stop any active focus session
      if (existingTask.status === TaskStatus.NOW && focus.activeTaskId === id && focus.phase !== 'idle') {
        stopFocusEarly();
      }
    } 
    // If clearing a future startAt or moving it to the past, bring it back to INBOX if it was SCHEDULED
    else if ((finalUpdates.startAt === undefined || finalUpdates.startAt <= now) && existingTask.status === TaskStatus.SCHEDULED) {
      finalUpdates.status = TaskStatus.INBOX;
    }

    await db.tasks.update(id, finalUpdates);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...finalUpdates } : t)
    }));
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id), selectedTaskId: null }));
  },

  createProject: async (name, color) => {
      const newProj: Project = { id: generateId(), name, color, pinned: false };
      await db.projects.add(newProj);
      set(state => ({ projects: [...state.projects, newProj] }));
  },

  renameProject: async (id, newName, newColor) => {
      const { projects, tasks } = get();
      const project = projects.find(p => p.id === id);
      if (!project) return;
      
      const oldName = project.name;
      
      // 1. Update Project Record
      const updates: Partial<Project> = { name: newName };
      if (newColor) updates.color = newColor;
      await db.projects.update(id, updates);

      // 2. Propagate name change to all tasks that used the old name
      const tasksToUpdate = tasks.filter(t => t.projectId === oldName);
      
      // Parallel update in DB
      await Promise.all(
          tasksToUpdate.map(t => db.tasks.update(t.id, { projectId: newName, updatedAt: Date.now() }))
      );

      // 3. Update Store State
      set(state => ({
          projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
          tasks: state.tasks.map(t => t.projectId === oldName ? { ...t, projectId: newName, updatedAt: Date.now() } : t)
      }));
  },

  togglePinProject: async (id) => {
      const { projects } = get();
      const project = projects.find(p => p.id === id);
      if (!project) return;
      await db.projects.update(id, { pinned: !project.pinned });
      set(state => ({
          projects: state.projects.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p)
      }));
  },

  deleteProject: async (id) => {
      await db.projects.delete(id);
      set(state => ({ projects: state.projects.filter(p => p.id !== id) }));
  },

  moveToSpotlight: async (id, target) => {
    const { tasks, updateTask, focus } = get();
    
    // Safety check for timer
    if (focus.phase === 'focus' && focus.activeTaskId !== id && target === 'now') {
       if (!confirm("A focus session is running on another task. Stop it and switch?")) return;
       get().stopFocusEarly(); 
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
          set({ focus: { ...focus, isRitualOpen: 'start' } });
      } else if (focus.phase === 'focus' || focus.phase === 'break') {
          set({ focus: { ...focus, isRitualOpen: 'stop' } });
      }
  },

  startFocusSession: async (taskId, preset) => {
      const { tasks, moveToSpotlight } = get();
      const now = Date.now();
      
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== TaskStatus.NOW) {
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
      set(state => ({ focus: { ...state.focus, isRitualOpen: 'stop' } }));
  },

  completeBreakPhase: () => {
     const newFocus: FocusState = { ...INITIAL_FOCUS_STATE, suggestedBreak: false };
     set({ focus: newFocus });
     localStorage.setItem('founderflow_focus_state', JSON.stringify(newFocus));
  },

  cancelRitual: () => {
      const { focus } = get();
      set({ focus: { ...focus, isRitualOpen: null } });
  },

  finalizeSession: async (outcome) => {
      const { focus, focusSessions, updateTask } = get();
      if (!focus.startTime || !focus.preset) return; 

      const session: FocusSession = {
          id: generateId(),
          taskId: focus.activeTaskId || undefined,
          type: focus.phase === 'focus' ? 'focus' : 'break',
          presetLabel: focus.preset.label,
          plannedMinutes: focus.preset.focusMinutes,
          startedAt: focus.startTime,
          endedAt: Date.now(),
          completed: !outcome.reason, 
          outcome
      };

      await db.focusSessions.add(session);
      
      if (outcome.finishedTask && focus.activeTaskId) {
          await updateTask(focus.activeTaskId, { status: TaskStatus.DONE, completedAt: Date.now() });
      }

      const nextState: FocusState = {
          ...INITIAL_FOCUS_STATE,
          suggestedBreak: focus.phase === 'focus' 
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
