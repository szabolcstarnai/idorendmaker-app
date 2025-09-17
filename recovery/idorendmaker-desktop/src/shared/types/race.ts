// Race and Level type definitions for the Időrend Készítő application

export interface Race {
  id: number;
  name: string;
  discipline: string;
  boatClass: string;
  gender: string;
  distance: string;
  occurrence: number;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgeGroup {
  id: number;
  name: string;
  minAge: number;
  maxAge: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RaceAgeGroup {
  id: number;
  raceId: number;
  ageGroupId: number;
  race: Race;
  ageGroup: AgeGroup;
}

export interface RaceWithAgeGroups extends Race {
  ageGroups: AgeGroup[];
}

export interface Level {
  id: number;
  name: string;
  levelType: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleRace {
  id: number;
  scheduleId: number;
  raceId: number;
  levelId: number;
  sectionId: number;
  position: number;
  intervalMinutes: number;
  race: RaceWithAgeGroups;
  level: Level;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: number;
  name: string;
  startTime: string;
  mode: 'simplified' | 'full';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleSection {
  id: number;
  scheduleId: number;
  name: string;
  startTime: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleWithSections extends Schedule {
  sections: ScheduleSection[];
  scheduleRaces: ScheduleRace[];
}

// Competition level types
export type LevelType = 'döntő' | 'előfutam' | 'középfutam';

// Schedule mode types
export type ScheduleMode = 'simplified' | 'full';

// Race discipline types
export type Discipline = 'Kajak' | 'Kenu' | 'SUP' | 'Kajakpóló';

// Gender types
export type Gender = 'Férfi' | 'Női' | 'Vegyes';