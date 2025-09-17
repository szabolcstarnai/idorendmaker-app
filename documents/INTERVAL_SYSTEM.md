# Intervals-Between-Races System ✅ IMPLEMENTED

## Final Conceptual Model

The interval system uses **visual intervals displayed BETWEEN races** where they actually exist, making the scheduling intuitive and predictable.

### Mental Model: Intervals AS Visual Separators

Intervals are displayed as visual separators between race cards:
```
┌─────────────┐
│   Race 'a'  │ 9:00
└─────────────┘
       ↓ +00:05 (clickable interval badge)
┌─────────────┐
│   Race 'b'  │ 9:05  
└─────────────┘
       ↓ +00:10 (clickable interval badge)
┌─────────────┐
│   Race 'c'  │ 9:15
└─────────────┘
```

## Data Structure

### Separate Arrays Approach
- **`scheduleRaces[]`**: Array of race objects (clean, no interval data)
- **`intervals[]`**: Array of break times between races (in minutes)
- **`intervals[i]`**: Break time after `race[i]` before `race[i+1]`

### Simple Time Calculation
```typescript
race[i].time = startTime + sum(intervals[0...i-1])
```

## Visual Implementation

### Clean Race Cards
- **No `(+time)` on race cards** - just race time and info
- **Professional, uncluttered design**
- **Drag handle on time display**

### Visual Interval Separators
- **Dashed line separators** between race cards
- **Clickable interval badges** showing `+HH:MM` format
- **Timer icon** and hover effects for clarity
- **Blue styling** to distinguish from race content

### Editable Intervals
- **Click interval badge** to edit that specific break time
- **Prompt dialog** for easy value entry
- **Immediate recalculation** of all subsequent race times
- **Preserves other intervals** unchanged

## User Interactions

### Adding Races
1. **Click race from left panel** → adds to end of schedule
2. **Creates interval** using current global interval setting
3. **Visual feedback** with new interval separator
4. **Automatic time calculation**

### Editing Intervals
1. **Click interval badge** between any two races
2. **Enter new minutes** in prompt dialog
3. **System recalculates** all times after that point

### Reordering (Drag & Drop)
1. **Drag races by time display** (drag handle)
2. **Intervals move with their positions** (stay between same relative races)
3. **Visual drop indicators** show valid drop zones
4. **Predictable time recalculation**

## Case Study Verification ✅

**Initial Setup:**
```
Race 'a' [9:00]
   ↓ +00:05
Race 'b' [9:05] 
   ↓ +00:10
Race 'c' [9:15]
```

**After moving 'c' to first position:**
```
Race 'c' [9:00]
   ↓ +00:10  ← interval moved with position
Race 'a' [9:10] 
   ↓ +00:05  ← interval moved with position
Race 'b' [9:15]
```

**Perfect match with expected behavior!** ✅

## Technical Implementation

### State Management
```typescript
const [scheduleRaces, setScheduleRaces] = useState<ScheduleRace[]>([]);
const [intervals, setIntervals] = useState<number[]>([]);
```

### Time Calculation Function
```typescript
const calculateRaceTime = (raceIndex: number, customIntervals?: number[]): string => {
  if (raceIndex === 0) return startTime;
  const totalMinutes = startTimeInMinutes + sum(intervals[0...raceIndex-1]);
  return formatTime(totalMinutes);
};
```

### Interval Updates
```typescript
const updateInterval = (intervalIndex: number, newMinutes: number) => {
  setIntervals(prev => [...prev.slice(0, intervalIndex), newMinutes, ...prev.slice(intervalIndex + 1)]);
  recalculateAllTimes();
};
```

## System Benefits

### ✅ **Visual Clarity**
- Intervals exactly where breaks occur
- No confusing `(+time)` on race cards
- Professional, clean interface

### ✅ **Intuitive Behavior**
- What you see is what you get
- Predictable reordering effects
- Simple mental model

### ✅ **Flexible Customization**
- Individual interval editing
- Global interval setting for new races
- Mix of different break times

### ✅ **Reactive System**
- Changes to start time recalculate all
- Interval changes update immediately

### ✅ **Robust Implementation**
- Clean separation of concerns
- Simple data structures
- Maintainable codebase

## Integration Notes

- **Database storage**: `intervals[i]` stored as `interval_minutes` field
- **Migration support**: Existing data migrated to new model
- **Drag & drop**: Enhanced with @hello-pangea/dnd
- **Performance**: Optimized calculations with useCallback