# ScheduleBuilder Architecture - Component-Based Refactoring

## Overview

The ScheduleBuilder component has been completely refactored from a monolithic 780-line file into a modular, component-based architecture. This refactoring dramatically improves maintainability, testability, and prevents future bugs through better separation of concerns.

## Refactoring Results

### Before vs After
- **Before**: 780 lines, 7 mixed responsibilities in one file
- **After**: 161 lines main component + 7 focused components/hooks
- **Reduction**: ~620 lines extracted into reusable, testable units

### Architecture Benefits Achieved
- ✅ **Single Responsibility**: Each component has one clear purpose
- ✅ **Better Testability**: Smaller units easier to unit test
- ✅ **Improved Performance**: Granular React.memo optimization
- ✅ **Enhanced Reusability**: Components reusable across the application
- ✅ **Bug Prevention**: Isolated changes reduce unintended side effects

## Component Architecture

### Core Components & Hooks

#### 1. **ScheduleTimeCalculator** (Utility)
**Location**: `src/utils/scheduleTimeCalculator.ts` (73 lines)

**Responsibility**: Pure time calculation functions

```typescript
// Core functions
- calculateRaceTime(raceIndex, intervals, startTime)
- formatInterval(minutes) 
- calculateTotalDuration(startTime, endTime, strings)
- timeToMinutes() / minutesToTime()
- recalculateRaceTimes(races, intervals, startTime)
```

**Benefits**:
- Pure functions - easily testable
- No side effects
- Reusable across components
- Single source of truth for time logic

#### 2. **useScheduleSectionData** (Custom Hook)
**Location**: `src/hooks/useScheduleSectionData.ts` (286 lines)

**Responsibility**: Complex section state management

```typescript
// State Management
- sectionDataMap: Map<number, SectionWorkingData>
- Section initialization and cleanup
- Race operations (add, remove, move)
- Interval management
- Time recalculation coordination

// Operations Provided
- addRaceToSchedule(race)
- removeRaceFromSchedule(id)
- moveRace(fromIndex, toIndex)
- setStartTime(time) / setIntervalMinutes(interval)
- updateInterval(index, minutes)
```

**Benefits**:
- Encapsulates complex state logic
- Reusable across different UI contexts  
- Easier to test state transitions
- Clean separation from UI concerns

#### 3. **useSaveSchedule** (Custom Hook)
**Location**: `src/hooks/useSaveSchedule.ts` (78 lines)

**Responsibility**: Schedule saving logic and error handling

```typescript
// Save Operations
- Data format conversion (working data → database)
- Callback vs direct save mode handling
- Error handling with user feedback
- Save validation and permissions

// Interface
- saveSchedule(): Promise<void>
- canSave: boolean
```

**Benefits**:
- Clean save abstraction
- Centralized error handling
- Testable save logic
- Consistent user feedback

#### 4. **ScheduleSettings** (Component)
**Location**: `src/components/ScheduleSettings.tsx` (89 lines)

**Responsibility**: Schedule configuration panel

```typescript
// UI Elements
- Schedule name input
- Start time picker
- Default interval setting
- Save button with state
- Duration and race count display

// Props Interface
interface ScheduleSettingsProps {
  scheduleName: string
  setScheduleName: (name: string) => void
  startTime: string
  setStartTime: (time: string) => void
  intervalMinutes: number
  setIntervalMinutes: (interval: number) => void
  totalDuration: string
  raceCount: number
  canSave: boolean
  onSave: () => void
}
```

**Benefits**:
- Reusable settings panel
- Self-contained form logic
- Easy to modify settings UI
- Clear props interface

#### 5. **ScheduleRaceCard** (Component)
**Location**: `src/components/ScheduleRaceCard.tsx` (76 lines)

**Responsibility**: Individual race card rendering

```typescript
// Features
- Race information display
- Badge system (discipline, class, gender, distance)
- Age group display
- Drag handle integration
- Remove button functionality
- Order badge (#1, #2, etc.)

// Drag & Drop Integration
- Accepts react-beautiful-dnd props
- Handles drag state styling
- Provides drag handle
```

**Benefits**:
- Isolated race display logic
- Reusable in other contexts (race lists, archives)
- Self-contained drag behavior
- Easy to modify race card appearance

#### 6. **IntervalSeparator** (Component)
**Location**: `src/components/IntervalSeparator.tsx` (81 lines)

**Responsibility**: Interval editing between races

```typescript
// Features
- Visual dashed line separator
- Clickable interval badge
- Inline editing with input field
- Save/cancel editing operations
- Keyboard controls (Enter/Escape)
- Time formatting display

// Editing States
- Display mode: Shows formatted interval time
- Edit mode: Input field with validation
- Keyboard navigation support
```

**Benefits**:
- Clean interval management UI
- Self-contained editing logic
- Consistent interaction patterns
- Easy to modify interval behavior

#### 7. **ScheduleRaceList** (Component)
**Location**: `src/components/ScheduleRaceList.tsx` (126 lines)

**Responsibility**: Drag-drop list orchestration

```typescript
// Features
- Drag & Drop context management
- Empty state handling
- Race card + interval separator coordination
- Scroll area management
- Drag-over visual feedback

// State Management
- Interval editing state
- Drag operation coordination
- List rendering optimization
```

**Benefits**:
- Focused list management
- Encapsulated drag-drop logic
- Clean empty state handling
- Optimized rendering performance

### 8. **ScheduleBuilder** (Main Component)
**Location**: `src/components/ScheduleBuilder.tsx` (161 lines)

**Responsibility**: High-level component orchestration

```typescript
// Orchestration Responsibilities
- Component composition and layout
- Prop passing between components
- Effect coordination (selectedRace, schedule changes)
- Hook integration and data flow
- Parent component communication

// No Longer Handles
- ❌ State management (delegated to hooks)
- ❌ Time calculations (delegated to utils)
- ❌ Save logic (delegated to useSaveSchedule)
- ❌ UI rendering details (delegated to components)
```

**Benefits**:
- Clean, readable main component
- Focus on composition over implementation
- Easy to understand data flow
- Simple to modify layout and structure

## Data Flow Architecture

### State Management Flow
```
App Component
  ↓ (schedule, currentSectionId, callbacks)
ScheduleBuilder (orchestrator)
  ↓ (schedule, currentSectionId, onSectionStartTimeChange)
useScheduleSectionData Hook
  ↓ (working data operations)
Individual Components
  ↓ (user interactions)
State Updates → Recalculations → UI Updates
```

### Component Communication
```
ScheduleSettings ←→ ScheduleBuilder ←→ ScheduleRaceList
       ↓                                    ↓
  useSaveSchedule                    ScheduleRaceCard
       ↓                                    ↓
   Save Logic                        IntervalSeparator
       ↓                                    ↓
   Database                          Interval Editing
```

## Testing Strategy

### Unit Testing Approach
1. **Pure Functions** (`scheduleTimeCalculator.ts`)
   - Test all time calculations with various inputs
   - Test edge cases (midnight, long durations)
   - Test time format conversions

2. **Custom Hooks** (`useScheduleSectionData`, `useSaveSchedule`)
   - Test state transitions
   - Test complex operations (race reordering)
   - Test error conditions

3. **Components** (individual testing)
   - Test rendering with various props
   - Test user interactions (clicks, edits)
   - Test drag-drop behavior

### Integration Testing
- Test complete schedule building workflow
- Test section switching with data preservation
- Test save operations end-to-end

## Migration Benefits

### Code Quality Improvements
- **Maintainability**: Changes isolated to relevant components
- **Readability**: Each file has clear, single purpose  
- **Performance**: Granular re-rendering optimization
- **Type Safety**: Better TypeScript coverage with focused interfaces

### Development Workflow Improvements
- **Debugging**: Easier to trace issues to specific components
- **Feature Addition**: Clear places to add new functionality
- **Code Review**: Smaller, focused changes easier to review
- **Testing**: Components can be tested independently

### Bug Prevention
- **Reduced Complexity**: Smaller functions easier to reason about
- **Isolated Changes**: Modifications don't affect unrelated functionality
- **Clear Interfaces**: Type-safe boundaries between components
- **Single Responsibility**: Each component has one reason to change

## Future Enhancements

### Easy Extensions
1. **New Race Card Features**: Modify `ScheduleRaceCard` without affecting other components
2. **Advanced Interval Logic**: Extend `IntervalSeparator` with complex timing rules
3. **Enhanced Settings**: Add new options to `ScheduleSettings` independently
4. **Alternative Save Formats**: Extend `useSaveSchedule` with export options

### Performance Optimizations
1. **Virtualization**: Add virtual scrolling to `ScheduleRaceList` for large schedules
2. **Memoization**: Apply React.memo more granularly to individual components
3. **State Optimization**: Further optimize hook state updates for complex schedules

### Testing Enhancements
1. **Component Library**: Create Storybook stories for each component
2. **Visual Regression**: Add screenshot tests for UI components  
3. **Performance Testing**: Benchmark large schedule handling
4. **Accessibility Testing**: Ensure drag-drop works with screen readers

This refactored architecture provides a solid foundation for future development while dramatically improving the current codebase maintainability and reducing the likelihood of bugs through better separation of concerns.