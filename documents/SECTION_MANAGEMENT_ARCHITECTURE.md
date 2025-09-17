# Section Management Architecture - Multi-Section Working Data System

## Overview

The section management system has been completely refactored to address critical data loss bugs and provide a robust, user-friendly multi-section schedule building experience. The new architecture implements an in-memory working data system that prevents data loss while allowing users to build complex schedules across multiple sections before saving to the database.

## Critical Issues Fixed

### 🚨 **Data Loss Bug (RESOLVED)**
- **Problem**: Users lost all race arrangements when switching between sections (morning/afternoon)
- **Root Cause**: Code deliberately cleared section data on switch (lines 94-96 in old ScheduleBuilder)
- **Solution**: Replaced with persistent in-memory storage using `Map<number, SectionWorkingData>`

### 🚨 **Missing State Setters (RESOLVED)**
- **Problem**: `ReferenceError: setStartTime is not defined` and `setIntervalMinutes is not defined`
- **Root Cause**: Settings were read-only computed values without corresponding state setters
- **Solution**: Added proper `useState` hooks with section-aware setter functions

### 🚨 **Broken Save Implementation (RESOLVED)**
- **Problem**: Save button only showed `console.log` placeholder
- **Root Cause**: Save logic was incomplete and didn't handle multi-section data
- **Solution**: Implemented real database operations with complete section data conversion

## New Architecture: Work-in-Memory, Save-When-Ready

### Core Philosophy
1. **Build Complete Schedules**: Users can work on multiple sections without database interference
2. **Zero Data Loss**: Section switching preserves all work automatically
3. **Atomic Saves**: Entire multi-section schedule saved in one database transaction
4. **Per-Section Settings**: Each section has independent start times and intervals

### Data Structure

```typescript
// Core working data interface
interface SectionWorkingData {
  sectionId: number
  races: ScheduleRace[]         // Race arrangements for this section
  intervals: number[]           // Break times between races (minutes)
  settings: {
    startTime: string          // Section-specific start time
    defaultInterval: number    // Default interval for new races
  }
}

// Main state management
const [sectionDataMap, setSectionDataMap] = useState<Map<number, SectionWorkingData>>(new Map())
```

### State Management Flow

#### Section Initialization
```typescript
// When accessing a section for the first time
if (currentSectionId && !sectionDataMap.has(currentSectionId)) {
  const newSectionData: SectionWorkingData = {
    sectionId: currentSectionId,
    races: [],
    intervals: [],
    settings: {
      startTime: currentSection.startTime,
      defaultInterval: 15
    }
  }
  setSectionDataMap(prev => new Map(prev).set(currentSectionId, newSectionData))
}
```

#### Section Switching
```typescript
// No data clearing - just switch to different section data
const currentSectionData = useMemo(() => {
  if (!currentSectionId) return null
  return sectionDataMap.get(currentSectionId)
}, [sectionDataMap, currentSectionId])

// Derived values automatically update
const scheduleRaces = currentSectionData?.races || []
const intervals = currentSectionData?.intervals || []
const startTime = currentSectionData?.settings.startTime || currentSection?.startTime || '09:00'
```

#### Settings Updates
```typescript
const setStartTime = useCallback((newStartTime: string) => {
  setSectionDataMap(prev => {
    const newMap = new Map(prev)
    const existingData = newMap.get(currentSectionId)
    
    if (existingData) {
      newMap.set(currentSectionId, {
        ...existingData,
        settings: { ...existingData.settings, startTime: newStartTime }
      })
    }
    return newMap
  })
}, [currentSectionId])
```

## Race Operations

### Add Race
```typescript
const addRaceToSchedule = (race: RaceWithAgeGroups) => {
  setSectionDataMap(prev => {
    const newMap = new Map(prev)
    const sectionData = newMap.get(currentSectionId)!
    
    // Add race with proper time calculation
    const newRace: ScheduleRace = {
      id: `${race.id}-${Date.now()}`,
      race,
      startTime: calculateRaceTime(sectionData.races.length, sectionData.intervals, sectionData.settings.startTime),
      order: sectionData.races.length
    }
    
    // Update intervals for new race
    const updatedIntervals = sectionData.races.length > 0 
      ? [...sectionData.intervals, sectionData.settings.defaultInterval]
      : sectionData.intervals
    
    newMap.set(currentSectionId, {
      ...sectionData,
      races: [...sectionData.races, newRace],
      intervals: updatedIntervals
    })
    
    return newMap
  })
}
```

### Remove Race
```typescript
const removeRaceFromSchedule = useCallback((id: string) => {
  setSectionDataMap(prev => {
    const newMap = new Map(prev)
    const sectionData = newMap.get(currentSectionId)!
    
    const raceIndex = sectionData.races.findIndex(sr => sr.id === id)
    const filteredRaces = sectionData.races.filter(sr => sr.id !== id)
    
    // Update intervals array - remove interval after deleted race
    const newIntervals = [...sectionData.intervals]
    if (raceIndex < newIntervals.length) {
      newIntervals.splice(raceIndex, 1)
    }
    
    // Recalculate times for remaining races
    const updatedRaces = filteredRaces.map((sr, index) => ({
      ...sr,
      order: index,
      startTime: calculateRaceTime(index, newIntervals, sectionData.settings.startTime)
    }))
    
    newMap.set(currentSectionId, {
      ...sectionData,
      races: updatedRaces,
      intervals: newIntervals
    })
    
    return newMap
  })
}, [currentSectionId, calculateRaceTime])
```

## Save Implementation

### Complete Schedule Save
```typescript
const saveSchedule = async () => {
  // Convert all section data to database format
  const sectionDataArray = schedule.sections.map(section => {
    const workingData = sectionDataMap.get(section.id)
    
    return {
      day_number: section.dayNumber,
      section_type: section.sectionType as 'délelőtt' | 'délután',
      start_time: workingData?.settings.startTime || section.startTime,
      items: workingData?.races.map((sr, index) => ({
        raceId: sr.race.id,
        orderIndex: index,
        intervalMinutes: workingData.intervals[index] || workingData.settings.defaultInterval,
        notes: undefined
      })) || []
    }
  })

  const scheduleId = await window.electronAPI.saveScheduleWithSections(
    scheduleName,
    sectionDataArray
  )
}
```

## Benefits of New Architecture

### For Users
1. **🚫 No Data Loss**: Can switch sections freely without losing work
2. **✅ Working Inputs**: Start time and interval settings function correctly
3. **🔄 Natural Workflow**: Build complete schedules at their own pace
4. **💾 Atomic Saves**: All sections saved together when ready
5. **⚙️ Per-Section Control**: Independent settings for each section

### For Development
1. **🧹 Clean State Management**: Proper React patterns with hooks
2. **🔧 Maintainable Code**: Clear separation of concerns
3. **🚀 Performance**: Only current section data rendered at once
4. **📦 Type Safety**: Full TypeScript coverage with proper interfaces
5. **🛠️ Extensible**: Easy to add features like conflict detection

## Migration from Old System

### Before (Problematic)
- Single-section state: `scheduleRaces`, `intervals`
- Data clearing on section switch
- Read-only settings (no setters)
- Placeholder save implementation

### After (Robust)
- Multi-section state: `Map<number, SectionWorkingData>`
- Persistent section data in memory
- Working setters for all settings
- Real database save operations

## Usage Examples

### Building a Multi-Day Schedule
1. User starts with Day 1, Morning section (automatically created)
2. Adds races to morning section - stored in `sectionDataMap.get(morningId)`
3. Switches to Day 1, Afternoon - morning data preserved automatically
4. Adds races to afternoon section - stored in `sectionDataMap.get(afternoonId)`
5. Adds Day 2 with morning/afternoon sections
6. Continues building across all sections
7. Clicks Save - entire `sectionDataMap` converted to database format and saved atomically

### Settings Management
1. User changes start time for morning section - updates `sectionDataMap.get(morningId).settings.startTime`
2. Changes default interval for afternoon - updates `sectionDataMap.get(afternoonId).settings.defaultInterval`
3. All time calculations automatically recalculate for affected sections
4. Settings persist when switching sections

This architecture provides a robust foundation for complex multi-section schedule building while maintaining excellent user experience and code maintainability.