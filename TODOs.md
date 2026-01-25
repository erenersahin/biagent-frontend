# Frontend TODOs - Feature Gap Analysis

**Generated:** 2026-01-24
**Based on:** Features 01-07 specification analysis

---

## Summary

| Feature | Status | Completeness |
|---------|--------|--------------|
| 01-JIRA Sync | Partial | 65% |
| 02-Pipeline Execution | Mostly Done | 80% |
| 03-User Feedback | Partial | 60% |
| 04-Code Review | **NOT STARTED** | 0% |
| 05-Agent Execution | Good | 75% |
| 06-Session Persistence | Good | 70% |
| 07-Worktree Isolation | Good | 75% |

---

## Feature 01: JIRA Ticket Sync

### Implemented ✓
- Zustand store: `setTickets()`, `setTicketStats()`, `setLastSynced()`
- API clients: `listTickets()`, `triggerSync()`
- Dashboard with stats and ticket list
- WebSocket handlers: `sync_complete`, `ticket_updated`
- JIRA status color badges

### Missing ✗

- [ ] **Visual Feedback**
  - [ ] Yellow pulse flash animation when tickets update
  - [ ] Spinning icon during sync polling
  - [ ] Toast notifications for ticket updates
  - [ ] Warning badge if ticket changes during active pipeline

- [ ] **Status Display**
  - [ ] "Last synced: X minutes ago" in footer/status bar
  - [ ] Sync progress indicator

---

## Feature 02: Pipeline Execution

### Implemented ✓
- Full lifecycle (pending → running → completed)
- Token streaming with text merging
- Step status icons
- Cost tracking per step
- Auto-scroll on token arrival
- Progress indicator "Step X of N"
- Markdown rendering with syntax highlighting

### Missing ✗

- [ ] **Cycle Type Support** (HIGH PRIORITY)
  - [ ] `CycleTypeSelector.tsx` - Modal to select cycle before start
  - [ ] Dynamic phase rendering based on cycle type
  - [ ] Update store with `currentCycleType` and `cyclePhases` state
  - [ ] API integration for cycle phases

- [ ] **Risk Analysis**
  - [ ] `RiskAnalysisCards.tsx` - Display risk items from Design phase
  - [ ] Risk severity badges (high/medium/low)
  - [ ] Risk acknowledgment UI

- [ ] **UI Improvements**
  - [ ] Auto-expand first step on pipeline start
  - [ ] Completion banner "Pipeline complete!"
  - [ ] Phase progress visualization for variable steps

---

## Feature 03: User Feedback & Clarifications

### Implemented ✓
- Clarification request/response flow (ClarificationPrompt.tsx)
- Options with "Other" custom answer
- `answerClarification()` API call
- Step "waiting" status with blue pulse

### Partial ⚠
- Feedback textarea exists but lacks context
- Restart mode exists but no confirmation

### Missing ✗

- [ ] **Feedback Improvements**
  - [ ] Show previous step output above feedback input
  - [ ] Confirmation dialog for restart
  - [ ] Feedback history display
  - [ ] "Attempt X of Y" counter
  - [ ] "Revised based on feedback" indicator

- [ ] **Mid-Execution Feedback**
  - [ ] Pause + provide feedback flow
  - [ ] Guidance textarea for restart

- [ ] **History UI**
  - [ ] Step output history viewer
  - [ ] Feedback timeline per step

---

## Feature 04: Code Review Response (HIGH PRIORITY - 0% Done)

### Missing ✗ (Complete Implementation Needed)

- [ ] **Components to Create**
  - [ ] `PRStatusPanel.tsx` - PR details, link, approval count
  - [ ] `ReviewCommentsList.tsx` - Display review comments
  - [ ] `ReviewIterationTimeline.tsx` - Feedback rounds visualization

- [ ] **State Management**
  ```typescript
  // Add to store.ts
  interface StoreState {
    currentPR: PullRequest | null
    reviewComments: ReviewComment[]
    reviewIterations: ReviewIteration[]
  }
  ```

- [ ] **WebSocket Handlers**
  - [ ] `review_received` - New comments arrived
  - [ ] `review_responded` - Agent responded
  - [ ] `pr_approved` - PR was approved
  - [ ] `changes_requested` - Changes requested
  - [ ] `waiting_for_review` - Pipeline waiting

- [ ] **API Integration**
  - [ ] `getPipelinePR(pipelineId)`
  - [ ] `getReviewComments(pipelineId)`
  - [ ] `markPipelineComplete(pipelineId)`

- [ ] **UI States**
  - [ ] PR waiting state with "View PR" button
  - [ ] Review comment cards with file/line info
  - [ ] Agent response display
  - [ ] Iteration counter (Round 1, Round 2, etc.)
  - [ ] Approval/merge confirmation UI

---

## Feature 05: Agent Step Execution

### Implemented ✓
- Token streaming with cursor animation
- Tool call tracking with expandable args
- Markdown rendering with syntax highlighting
- Error message display
- Running/completed event rendering

### Missing ✗

- [ ] **File Changes Display**
  - [ ] Files created/modified/deleted list
  - [ ] Inline diff viewer for code changes
  - [ ] File change icons

- [ ] **Tool Call Enhancements**
  - [ ] Tool call duration display
  - [ ] Tool result preview (collapsed by default)

- [ ] **Step Artifacts**
  - [ ] Context summary card (Step 1)
  - [ ] Risk assessment card (Step 2)
  - [ ] Implementation plan card (Step 3)
  - [ ] Artifact preview/expand functionality

---

## Feature 06: Session Persistence

### Implemented ✓
- Session ID in localStorage
- `restoreSession()` on app init
- Tab management (addTab, removeTab, setActiveTab)
- WebSocket reconnect on visibility change
- Offline detection

### Missing ✗

- [ ] **Offline Events** (HIGH PRIORITY)
  - [ ] `OfflineEventBanner.tsx` - "While you were away..." display
  - [ ] Show missed events (steps completed, pipeline finished)
  - [ ] Acknowledge events API call
  - [ ] Dismiss banner functionality

- [ ] **Session Restore UI**
  - [ ] "Restoring your session..." loading state
  - [ ] Session restore error handling

- [ ] **UI State Persistence**
  - [ ] Save scroll positions
  - [ ] Save expanded panel states
  - [ ] Implement `updateUIState()` in store

---

## Feature 07: Worktree Isolation

### Implemented ✓
- Setup command input (UserInputPrompt.tsx)
- Suggested commands with "Use these" button
- Repo filtering
- Package manager detection
- `provideUserInput()` API call
- WebSocket handlers for worktree events

### Missing ✗

- [ ] **Progress Visualization**
  - [ ] `WorktreeProgressPanel.tsx` - Creation progress indicator
  - [ ] Setup output/logs display
  - [ ] Per-repo status indicators

- [ ] **Error Handling**
  - [ ] Setup failure recovery UI
  - [ ] Retry mechanism
  - [ ] Error details display

- [ ] **Multi-Repo Support**
  - [ ] Multi-repo visualization (tree/list view)
  - [ ] Branch name display per repo
  - [ ] PR status per repo

- [ ] **Completion Flow**
  - [ ] PR merge confirmation
  - [ ] Cleanup notification

---

## Backend SDK Compatibility

### Currently Works ✓
- Reads `worktree_status` from Pipeline
- Handles `user_input_request` with repo metadata
- Session restore includes full pipeline state

### Needs Implementation ✗
- [ ] Display `Session.missed_events` to user
- [ ] Call `acknowledgeEvents()` after viewing
- [ ] Handle new session fields from PipelineSession

---

## New Components Needed

| Component | Feature | Priority |
|-----------|---------|----------|
| `PRStatusPanel.tsx` | 04 | HIGH |
| `ReviewCommentsList.tsx` | 04 | HIGH |
| `CycleTypeSelector.tsx` | 02 | HIGH |
| `OfflineEventBanner.tsx` | 06 | HIGH |
| `RiskAnalysisCards.tsx` | 02 | MEDIUM |
| `ReviewIterationTimeline.tsx` | 04 | MEDIUM |
| `WorktreeProgressPanel.tsx` | 07 | MEDIUM |
| `StepArtifactPreview.tsx` | 05 | LOW |
| `FileDiffViewer.tsx` | 05 | LOW |

---

## Store Updates Needed

```typescript
// Add to lib/store.ts

interface StoreState {
  // Existing...

  // Feature 02: Cycle Types
  currentCycleType: string | null
  cyclePhases: Phase[]

  // Feature 04: Code Review
  currentPR: PullRequest | null
  reviewComments: ReviewComment[]
  reviewIterations: ReviewIteration[]

  // Feature 06: Offline Events
  offlineEvents: OfflineEvent[]
  showOfflineBanner: boolean
}

// New actions
interface StoreActions {
  // Feature 02
  setCycleType: (type: string) => void
  setCyclePhases: (phases: Phase[]) => void

  // Feature 04
  setCurrentPR: (pr: PullRequest | null) => void
  addReviewComment: (comment: ReviewComment) => void
  addReviewIteration: (iteration: ReviewIteration) => void

  // Feature 06
  setOfflineEvents: (events: OfflineEvent[]) => void
  acknowledgeOfflineEvents: () => void
}
```

---

## API Clients Needed

```typescript
// Add to lib/api.ts

// Feature 02: Cycles
export async function getCycleTypes(): Promise<CycleType[]>
export async function getCyclePhases(cycleType: string): Promise<Phase[]>

// Feature 04: Code Review
export async function getPipelinePR(pipelineId: string): Promise<PullRequest>
export async function getReviewComments(pipelineId: string): Promise<ReviewComment[]>
export async function markPipelineComplete(pipelineId: string): Promise<void>

// Feature 06: Events
export async function acknowledgeEvents(eventIds: string[]): Promise<void>
```

---

## Priority Order

### HIGH (Block 1 - Critical)
1. **Feature 04: Code Review UI** - Complete implementation
2. **Feature 02: Cycle Type Selector** - Modal and dynamic phases
3. **Feature 06: Offline Event Banner** - User notification

### MEDIUM (Block 2 - Important)
4. Feature 02: Risk analysis cards
5. Feature 07: Worktree progress visualization
6. Feature 03: Feedback history and improvements
7. Feature 01: Sync animations and toast notifications

### LOW (Block 3 - Polish)
8. Feature 05: File diff viewer
9. Feature 05: Step artifact previews
10. Feature 06: UI state persistence
11. Component refactoring (StepCard.tsx is 525 lines)
12. Loading skeletons
13. Accessibility improvements

---

## Testing Needed

- [ ] WebSocket message handler tests
- [ ] Store action tests
- [ ] Component unit tests
- [ ] Integration tests for API calls
- [ ] E2E tests for critical flows (pipeline start, feedback, review)
