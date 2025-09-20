# Competitor Tracking Algorithm - Test Scenario Validation (UPDATED)

## FINAL ALGORITHM: Race Pair Analysis with Worst-Case Logic

The algorithm has been completely redesigned to use **race pair analysis** instead of individual race selection. This provides comprehensive conflict detection while implementing proper worst-case scenario logic.

## Test Case 1: Original Case Study

### Setup
- **Race1**: Bob, Peter
- **Race2**: Peter, Abby

### Schedule
```
9:00  Race1-LevelType1-Level1 (Race1 Előfutam I.)
9:15  Race1-LevelType1-Level2 (Race1 Előfutam II.)
9:30  Race2-LevelType1-Level1 (Race2 Előfutam I.)
9:45  Race1-LevelType1-Level3 (Race1 Előfutam III.)
10:00 Race1-LevelType2-Level1 (Race1 Középfutam I.)
```

### Expected Results with Race Pair Algorithm

#### Bob (Race1 only)
**Race Pairs Expected**:
1. **Race1-Előfutam → Race1-Középfutam**: Shows worst-case gap between these level types
   - Should show the Előfutam heat that creates shortest gap to Középfutam
   - Expected: `9:45 Race1 Előfutam III. → 10:00 Race1 Középfutam I. (15min gap)`

#### Peter (Race1 + Race2)
**Race Pairs Expected**:
1. **Race1-Előfutam → Race2-Előfutam**: Shows gap between different races
   - Expected: `9:15 Race1 Előfutam II. → 9:30 Race2 Előfutam I. (15min gap)`
2. **Race2-Előfutam → Race1-Előfutam**: Reverse pair analysis
   - Expected: `9:30 Race2 Előfutam I. → 9:45 Race1 Előfutam III. (15min gap)`
3. **Race1-Előfutam → Race1-Középfutam**: Progression within same race
   - Expected: `9:45 Race1 Előfutam III. → 10:00 Race1 Középfutam I. (15min gap)`

### New Data Structure

**Backend Response**: `CompetitorRacePairDetailsDto[]`
**Frontend Display**: Race pairs with gap analysis

```typescript
interface CompetitorRacePairDetails {
  race1Id: number
  race1Name: string
  race1StartTime: string
  race2Id: number | null
  race2Name: string | null
  race2StartTime: string | null
  intervalToNext: number | null // Gap between the races
  conflictLevel: 'none' | 'warning' | 'critical'
}
```

### UI Display Format

**New Format**:
```
Peter (Spartacus SE):
├─ 9:15 Race1 Előfutam II.
│  → 9:30 Race2 Előfutam I. (⚠️ 15min gap)
├─ 9:30 Race2 Előfutam I.
│  → 9:45 Race1 Előfutam III. (⚠️ 15min gap)
├─ 9:45 Race1 Előfutam III.
│  → 10:00 Race1 Középfutam I. (⚠️ 15min gap)
```

## Test Case 2: Single Race, Multiple Heats

### Setup
- **Race1**: Alice
- **Schedule**:
  - 9:00 Race1-LevelType1-Heat1
  - 9:15 Race1-LevelType1-Heat2
  - 10:00 Race1-LevelType2-Heat1

### Expected Result
**Alice**: `[9:15, 10:00]` (latest heat of LevelType1, plus LevelType2)

## Test Case 3: Multiple Competitors, No Overlap

### Setup
- **Race1**: Alice
- **Race2**: Bob
- **Schedule**:
  - 9:00 Race1-LevelType1-Heat1
  - 9:15 Race1-LevelType1-Heat2
  - 9:30 Race2-LevelType1-Heat1
  - 9:45 Race2-LevelType1-Heat2

### Expected Results
- **Alice**: `[9:15]` (latest heat of Race1)
- **Bob**: `[9:45]` (latest heat of Race2)

## Test Case 4: Complex Multi-Level Scenario

### Setup
- **Race1**: Charlie, David
- **Race2**: David
- **Schedule**:
  - 9:00 Race1-LevelType1-Heat1 (Előfutam I.)
  - 9:15 Race1-LevelType1-Heat2 (Előfutam II.)
  - 9:30 Race2-LevelType1-Heat1 (Előfutam I.)
  - 10:00 Race1-LevelType2-Heat1 (Középfutam I.)
  - 10:15 Race1-LevelType2-Heat2 (Középfutam II.)
  - 11:00 Race1-LevelType3-Heat1 (Döntő)

### Expected Results
- **Charlie** (Race1 only): `[9:15, 10:15, 11:00]` (latest heats of each level type)
- **David** (Race1 + Race2): `[9:00, 9:30, 10:00, 11:00]` (heats that minimize conflicts across races)

## Validation Checklist

### ✅ Algorithm Fixes Applied
- [x] `selectWorstCaseHeats()` uses competitor-specific races instead of all schedule races
- [x] Method parameter renamed for clarity (`competitorSpecificRaces`)
- [x] Comments updated to reflect competitor-aware logic

### 🧪 Test Scenarios to Verify
- [ ] Test Case 1: Original case study produces expected results
- [ ] Test Case 2: Single competitor, multiple heats works correctly
- [ ] Test Case 3: Multiple competitors with no overlap
- [ ] Test Case 4: Complex multi-level scenario

### 📊 Expected Behavior Changes
- **Before**: Worst-case selection considered conflicts with ALL races in schedule
- **After**: Worst-case selection considers conflicts only with races the specific competitor is entered in
- **Result**: More accurate and realistic worst-case scenario modeling

## Manual Testing Instructions

1. **Set up test data** with the case study competitors and races
2. **Process through competitor analysis** with fixed algorithm
3. **Verify results** match expected competitor schedules
4. **Check edge cases** with single heats, no conflicts, etc.
5. **Validate no regressions** in existing functionality