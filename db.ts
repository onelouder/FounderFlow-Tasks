import Dexie, { Table } from 'dexie';
import { Task, Project, FocusSession } from './types';

// Refactor to use instance-based configuration instead of class inheritance
// This fixes the "Property 'version' does not exist on type 'FounderFlowDB'" error
type FounderFlowDB = Dexie & {
  tasks: Table<Task>;
  projects: Table<Project>;
  focusSessions: Table<FocusSession>;
};

const db = new Dexie('FounderFlowDB') as FounderFlowDB;

// Update version to include focusSessions
db.version(1).stores({
  tasks: 'id, status, startAt, dueAt, projectId',
  projects: 'id, name',
  focusSessions: 'id, taskId, type, startedAt'
});

export { db };

// Seed function for demo
export const seedDatabase = async () => {
  const projectCount = await db.projects.count();
  if (projectCount === 0) {
    // Use bulkPut to safely insert or update preventing ConstraintError if keys exist
    await db.projects.bulkPut([
      { id: 'p1', name: 'Fundraising', pinned: true, color: '#f0b429' },
      { id: 'p2', name: 'Product', pinned: true, color: '#4ea1ff' },
      { id: 'p3', name: 'Hiring', pinned: true, color: '#35d07f' },
    ]);
  }
};