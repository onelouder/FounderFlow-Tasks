# Sprint 1 Implementation Notes

## Architecture & Choices
- **Tech Stack**: React 18, TypeScript, Tailwind, Zustand, Dexie.js, Chrono-node.
- **Why Zustand?**: We need a global store to bridge the UI and the Database. Redux is too boilerplate-heavy for this velocity, and Context API causes too many re-renders for a high-density dashboard. Zustand provides a clean mental model for the "Spotlight Rules" logic.
- **Why Dexie (IndexedDB)?**: The requirement is "Local First". `localStorage` is synchronous and blocks the main thread on large datasets. IndexedDB is async and holds significantly more data, paving the way for the "Vault" (10k+ tasks) in future sprints.
- **Why Chrono-node?**: Adopted for robust natural language parsing of dates (e.g., "next Fri 3pm") in the capture bar. This allows for a "smart capture" experience where deadlines are extracted automatically.

## Data Model Status Transitions
- **Capture**: `Inbox` (default) or `Next` (Cmd+Enter).
- **Spotlight Logic**:
    - Setting `NOW`: Demotes current `NOW` -> `NEXT` (top of list).
    - `NEXT` Limit: If >3, the store logic currently pushes the overflow to `TODAY` (Soft limit enforcement).
- **Resurfacing**:
    - Tasks are `SCHEDULED` with a `startAt` timestamp.
    - A `setInterval` in `App.tsx` checks every 10s (for demo) or 60s (prod).
    - If `startAt < now`, task moves to `INBOX` to demand attention again.

## Parsing & Capture Rules
- **Date Parsing**: 
    - Implicit: "Call Sam Fri 3pm" -> Due: Friday 3pm.
    - Explicit: "due:Fri" (Due), "start:tomorrow" (Start), "by Friday" (Due).
    - Default Times: If only date is provided, Due defaults to 5pm, Start defaults to 9am.
- **Cleanup**: Parsed tokens (dates, project `p:`, person `@`) are removed from the final task title to keep it clean.
- **Preview**: The capture bar uses a backdrop overlay to highlight detected segments (Project=Dim, Person=Blue, Due=Amber, Start=Underline).

## Focus Engine (Pomodoro)
- **Ethos**: Integrated into the NOW card. No separate full-screen mode.
- **Phases**: `idle` -> `ritual_start` -> `focus` -> `ritual_stop` -> `idle` (optional `break` loop).
- **Persistence**:
    - Ephemeral state (running timer) is saved to `localStorage` to survive page refresh.
    - Completed sessions are saved to `Dexie` (IndexedDB) for long-term stats.
- **Shortcuts**: `F` toggles the Ritual (Start if idle, Stop if running).
- **Timer Logic**: Uses wall-clock `endTime` comparison, not decremental counters, to ensure accuracy even if the tab is backgrounded.

## Shortcuts
| Key | Action | Context |
| --- | --- | --- |
| `/` | Focus Capture Bar | Global |
| `Cmd+K` | Command Palette | Global |
| `Enter` | Create Task (Inbox) | Capture Bar |
| `Cmd+Enter` | Create Task (Next) | Capture Bar |
| `S` | Snooze selected (Default: Tomorrow) | Task List |
| `F` | Start/Stop Focus Ritual | Global |
| `Click Play` | Set as NOW | Task Row |
| `Esc` | Close Popovers/Blur | Global |

## Known Gaps (Sprint 2 candidates)
1. **Virtualization**: Not implemented yet as Sprint 1 volume is low, but the architecture allows wrapping `TaskRow` in `react-window` easily.
2. **Date Picker**: Currently using browser native `input type="datetime-local"`. Need a custom keyboard-driven popover.
3. **Drag & Drop**: Not strictly required for Sprint 1 but essential for "ordering Next". Currently sorting by priority/date.
4. **Markdown Editor**: The notes field is a raw textarea. Needs a lightweight MD parser.
5. **Focus Stats**: Data is collected in `db.focusSessions`, but no UI exists to view history yet.

## How to Demo
1. **Capture**: Type "Call Investor p:Fundraising est:30m due:Fri 3pm" and hit `Cmd+Enter`.
   - Observe the text highlighting in the capture bar.
   - Verify the task jumps to NEXT with a deadline set.
2. **Spotlight**: Click the "Play" icon on the new task. See it replace the current NOW task.
3. **Focus**: Press `F` (or click "Start Focus").
   - Confirm the "Start Ritual" modal.
   - See the countdown appear in the NOW card.
4. **Stop**: Click the square "Stop" icon or press `F`.
   - Confirm the "Stop Ritual".
   - Select "Yes, Finished" or "Blocked".
5. **Snooze**: Select a task, hit `S` (or use Inspector clock). Watch it vanish.
6. **Resurface**: Wait 10s (or edit DB manually) to see it appear in Inbox/Today.