# Desktop App File Structure Guide

## Current Directory Organization

```
src/
├── components/
│   ├── app/              # Top-level app components (App.tsx, MainMenu.tsx, Navbar.tsx)
│   ├── schedule/         # Schedule creation & management (9 components)
│   ├── race/             # Race management (RaceList.tsx, LevelSelectorModal.tsx)
│   ├── rules/            # Rule engine UI (RuleManager.tsx, RuleEditor.tsx, etc.)
│   ├── pdf/              # PDF processing UI (PDFProcessor.tsx, CompetitorTracker.tsx)
│   ├── dialogs/          # Modal dialogs (UnsavedChangesDialog.tsx, ExportButton.tsx)
│   ├── common/           # Reusable UI components (pagination, search, etc.)
│   ├── layout/           # Layout components (TwoPanelLayout.tsx)
│   └── ui/               # shadcn/ui base components
├── features/             # Feature-based business logic
│   ├── schedule/         # Schedule hooks, utils, time calculations
│   ├── rules/            # Rule engine logic, constants, conditions
│   ├── pdf/              # PDF processing services, matching logic
│   └── common/           # Shared hooks, services (unsaved changes, export)
├── data/                 # Data layer
│   ├── services/         # Database services (RaceService, ScheduleService, etc.)
│   └── types/            # Type definitions (electron.d.ts)
├── utils/                # Global utilities (excelFormatter, levelUtils)
├── lib/                  # External library configurations
├── assets/               # Static assets
└── shared/               # Shared types and database schema (unchanged)
```

## File Placement Rules

### 🎯 **Where to Place New Files**

#### **React Components**
- **App-level navigation**: `components/app/`
- **Schedule building/editing**: `components/schedule/`
- **Race selection/filtering**: `components/race/`
- **Rule creation/management**: `components/rules/`
- **PDF upload/processing**: `components/pdf/`
- **Modal dialogs/popups**: `components/dialogs/`
- **Reusable across features**: `components/common/`

#### **Business Logic & Services**
- **Schedule-specific logic**: `features/schedule/`
- **Rule engine logic**: `features/rules/`
- **PDF processing**: `features/pdf/services/`
- **Cross-feature utilities**: `features/common/`
- **Database operations**: `data/services/`

#### **Utilities & Helpers**
- **Feature-specific utils**: `features/{feature}/utils/`
- **Global utilities**: `utils/`
- **Type definitions**: `data/types/` or `shared/types/`

### 📁 **Feature Directory Structure**
Each feature follows this pattern:
```
features/{feature}/
├── hooks/           # React hooks
├── utils/           # Pure utility functions
├── services/        # API/database services
├── constants/       # Configuration & constants
└── index.ts         # Barrel exports
```

### 🔄 **Import Patterns**
- Use barrel exports: `from 'features/schedule'`
- Components import from features: `import { useSchedule } from '../../features/schedule'`
- Features can import from data layer: `import { RaceService } from '../../data/services/RaceService'`

## Decision Matrix

| File Type | App-wide | Schedule | Rules | PDF | Race | Dialog |
|-----------|----------|----------|-------|-----|------|--------|
| **Component** | `components/app/` | `components/schedule/` | `components/rules/` | `components/pdf/` | `components/race/` | `components/dialogs/` |
| **Hook** | `features/common/hooks/` | `features/schedule/hooks/` | `features/rules/hooks/` | `features/pdf/hooks/` | `features/race/hooks/` | `features/common/hooks/` |
| **Service** | `features/common/services/` | `features/schedule/services/` | `features/rules/services/` | `features/pdf/services/` | `features/race/services/` | - |
| **Utility** | `utils/` | `features/schedule/utils/` | `features/rules/utils/` | `features/pdf/utils/` | `features/race/utils/` | - |

## Quick Reference

### ✅ **Do**
- Group related files by feature domain
- Use barrel exports in `index.ts` files  
- Keep database services in `data/services/`
- Place reusable UI components in `components/common/`

### ❌ **Don't**
- Mix different domains in the same directory
- Create new flat directories in `components/`
- Put business logic directly in components
- Skip barrel exports for new feature directories

### 🚀 **Examples**

**New schedule feature**: `features/schedule/hooks/useNewFeature.ts`  
**New rule component**: `components/rules/NewRuleComponent.tsx`  
**New PDF service**: `features/pdf/services/NewPDFService.ts`  
**Global utility**: `utils/newGlobalUtil.ts`

This structure supports scalability, maintainability, and clear separation of concerns while keeping the codebase organized and navigable.