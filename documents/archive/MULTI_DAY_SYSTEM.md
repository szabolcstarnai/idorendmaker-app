# Multi-Day Race Schedule System Documentation

## Overview

The Időrend Készítő application now supports comprehensive multi-day race scheduling with flexible section management. This system allows organizers to create complex schedules spanning multiple days, with each day divided into "Délelőtt" (morning) and "Délután" (afternoon) sections.

## Key Features

### 🗓️ Multi-Day Structure
- **Flexible Day Management**: Add any number of days to a schedule
- **Section-Based Organization**: Each day divided into morning and afternoon sections
- **Independent Start Times**: Each section can have its own configurable start time
- **Intuitive Navigation**: Easy switching between sections while preserving work

### 🧭 Navigation System
- **Section Navigator**: Compact interface showing current day/section with navigation controls
- **Previous/Next Buttons**: Navigate sequentially through all sections
- **Day/Section Toggles**: Quick switching between "Délelőtt" and "Délután" within a day
- **Visual Indicators**: Clear display of current position and section start time

### ⚙️ Section Management
- **Quick Day Addition**: One-click creation of complete days (morning + afternoon)
- **Individual Section Control**: Add specific sections as needed
- **Start Time Configuration**: Edit start times for each section independently
- **Section Removal**: Delete unused sections while preserving data integrity

### 💾 Robust Data Management (Updated)
- **🚫 Zero Data Loss**: Race arrangements fully preserved when switching sections - critical bug fixed
- **In-Memory Working Data**: Each section maintains races, intervals, and settings in memory using `Map<number, SectionWorkingData>`
- **Work-in-Memory Philosophy**: Build complete multi-section schedules before saving to database
- **Per-Section Settings**: Individual start times and default intervals maintained per section
- **✅ Functional Settings Inputs**: Start time and interval inputs work correctly without crashes
- **Atomic Save Operations**: Entire multi-section schedule saved to database in one operation

## Database Architecture

### Schema v3 Features
- **schedule_sections table**: Stores day/section information
- **Enhanced schedule_items**: Updated with section references
- **Backward Compatibility**: Existing schedules automatically migrated
- **Performance Optimized**: Indexed for fast section-based queries

### Table Structure
```sql
CREATE TABLE schedule_sections (
    id INTEGER PRIMARY KEY,
    schedule_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    section_type TEXT CHECK (section_type IN ('délelőtt', 'délután')),
    start_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedule_items (
    id INTEGER PRIMARY KEY,
    schedule_id INTEGER NOT NULL,
    section_id INTEGER,  -- NEW: Reference to schedule_sections
    race_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    interval_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## User Interface Components

### SectionNavigator
**Location**: Top of schedule builder  
**Purpose**: Navigate between different sections  
**Features**:
- Previous/Next section arrows
- Current day/section display
- Start time indicator
- Day selector for multi-day schedules

### DaySectionManager
**Location**: Collapsible panel in settings  
**Purpose**: Manage days and sections  
**Features**:
- Quick day addition ("Gyors nap hozzáadás")
- Individual section creation
- Start time editing
- Section removal with validation

### Enhanced ScheduleBuilder
**Purpose**: Section-aware race scheduling  
**Features**:
- Current section context
- Preserved race data during navigation
- Multi-section state management
- Enhanced save system

## Technical Implementation

### Type Definitions
```typescript
interface ScheduleSection {
  id: number;
  schedule_id: number;
  day_number: number;
  section_type: 'délelőtt' | 'délután';
  start_time: string;
  created_at: string;
}

interface MultiDaySchedule extends Schedule {
  sections: ScheduleSection[];
  current_section_id?: number;
}

interface SectionNavigationState {
  current_day: number;
  current_section: 'délelőtt' | 'délután';
  total_days: number;
}
```

### API Methods
- `createScheduleSection()` - Add new section
- `getScheduleSections()` - Retrieve sections for a schedule  
- `getScheduleItemsBySection()` - Get races for specific section
- `saveMultiDaySchedule()` - Persist complete multi-day schedule
- `getMultiDaySchedule()` - Load multi-day schedule with sections

## User Workflow

### Creating a Multi-Day Schedule
1. **Start with Default**: Application initializes with Day 1 "Délelőtt"
2. **Add Days**: Use "Gyors nap hozzáadás" to create complete days
3. **Configure Times**: Edit start times for each section as needed
4. **Add Races**: Select races for current section from race list
5. **Navigate Sections**: Use section navigator to switch between sections
6. **Save Schedule**: Save complete multi-day schedule with all sections

### Managing Sections
1. **View Current Section**: Navigator shows current day/section and start time
2. **Switch Sections**: Use Previous/Next arrows or day/section toggles
3. **Edit Start Times**: Click start times in section manager to modify
4. **Add/Remove Sections**: Use section manager for structural changes
5. **Preserve Work**: All changes automatically preserved during navigation

## Backward Compatibility

### Migration Strategy
- **Automatic Upgrade**: v2 databases automatically migrate to v3
- **Legacy Support**: Existing single-day schedules become Day 1 "Délelőtt"
- **No Data Loss**: All existing races and schedules preserved
- **Transparent Migration**: Users can continue working without interruption

### Schema Evolution
- **v2 to v3**: Add `schedule_sections` table and `section_id` column
- **Data Migration**: Create default sections for existing schedules
- **Index Creation**: Performance indexes for section-based queries
- **Validation**: Ensure data integrity during migration

## Best Practices

### Schedule Organization
- **Consistent Timing**: Use similar start times across days for consistency
- **Logical Grouping**: Group related races within appropriate sections
- **Time Buffers**: Allow adequate time between sections for setup
- **Backup Planning**: Keep section structure flexible for last-minute changes

### Performance Considerations
- **Section-Based Loading**: Only load races for current section
- **Efficient State Management**: Minimize re-renders during navigation
- **Optimized Queries**: Use section-specific database queries
- **Memory Management**: Clear unused section data when appropriate

## Future Enhancements

### Planned Features
- **Cross-Section Conflict Detection**: Rules spanning multiple sections
- **Section Templates**: Pre-configured section arrangements
- **Bulk Section Operations**: Copy/move races between sections
- **Advanced Export**: Multi-day schedule export formats
- **Section Analytics**: Time distribution and utilization analysis

### Integration Points
- **Rule Engine**: Multi-day rule validation
- **Export System**: Section-aware export formats
- **Import System**: Multi-day schedule import
- **Reporting**: Cross-section analytics and insights

---

## Quick Reference

### Section Types
- **"délelőtt"**: Morning section (default: 09:00)
- **"délután"**: Afternoon section (default: 14:00)

### Navigation Keys
- **Previous Section**: ← arrow button
- **Next Section**: → arrow button  
- **Day Toggle**: Click day numbers
- **Section Toggle**: Click "Délelőtt"/"Délután" buttons

### Management Actions
- **Add Complete Day**: "Gyors nap hozzáadás" button
- **Add Individual Section**: Manual section creation form
- **Edit Start Time**: Click time input in section list
- **Remove Section**: Trash icon (only if multiple sections exist)

This multi-day system provides the flexibility needed for complex multi-day race events while maintaining the intuitive interface and powerful features of the existing schedule builder.