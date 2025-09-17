# Időrend Készítő - Design System

*Version 2.0 - Simplified & Updated*  
*Last Updated: 2025-08-26 - 3-Layer Architecture & Work Layer Consistency*

## 📚 Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [3-Layer Architecture](#3-layer-architecture)
3. [Work Layer Guidelines](#work-layer-guidelines)
4. [Component Standards](#component-standards)
5. [Quick Reference](#quick-reference)

---

## Core Philosophy

### 🎯 **Design Principles**

**Information Density First**: Professional tool prioritizing content visibility over decorative elements
- Compact spacing: `p-4 space-y-4` standard for work layers
- Desktop-focused: 1280px+ screens
- Hungarian localization throughout

**Key Terms**:
- **Időrend** = Schedule/Timetable
- **Versenyszám** = Race
- **Főmenü** = Main Menu
- **PDF Feldolgozó** = PDF Processor

---

## 3-Layer Architecture

### **Layer 1: Main Menu**
```tsx
// Well-spaced cards with gradient header
<div className="h-screen flex flex-col bg-background">
  <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
    {/* App title and stats */}
  </div>
  <div className="flex-1 flex items-center justify-center p-6">
    <div className="w-full max-w-2xl space-y-4">
      {/* Feature cards */}
    </div>
  </div>
</div>
```

### **Layer 2: Submenu (Optional)**
*Only when logical choices are required*

Examples:
- ✅ "Új időrend" → ScheduleModeSelector (Simple vs Full choice)
- ❌ "Szabályok" → Direct to work (no choices needed)
- ❌ "PDF Feldolgozó" → Direct to work (no choices needed)

### **Layer 3: Work Layer**
*All functional interfaces use this pattern*

```tsx
// Standard work layer structure
<div className="h-screen flex flex-col">
  <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
  <div className="flex-1">
    <div className="flex-1 p-4 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Work content */}
      </div>
    </div>
  </div>
</div>
```

---

## Work Layer Guidelines

### **Standard Layout Pattern**
```tsx
// Work layer components follow this structure
<div className="flex-1 p-4 overflow-auto">
  <div className="max-w-4xl mx-auto space-y-4">
    {/* Content cards */}
  </div>
</div>
```

### **Spacing Standards**
- **Work layer containers**: `p-4 space-y-4`
- **Card content**: `p-3` or `p-2` for compact
- **Button groups**: `gap-2`
- **Form elements**: `space-y-3`

### **Component Examples**

**Status Card** (like PDF processor status):
```tsx
<Card>
  <CardContent className="pt-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Service Status</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm">Ready</span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Component Standards

### **Navbar Integration**
```tsx
// All work layer views use this pattern
<div className="h-screen flex flex-col">
  <Navbar currentView="pdf-processor" onNavigateHome={handleBackToMainMenu} />
  <div className="flex-1">
    {/* Work content */}
  </div>
</div>
```

**Page Titles**:
- 'create-schedule' → 'Új Időrend'
- 'load-schedule' → 'Mentett Időrendek'
- 'rule-management' → 'Szabálykezelő'
- 'pdf-processor' → 'PDF Feldolgozó'
- 'pdf-to-schedule' → 'Új Időrend (PDF Adatok)'

### **Card Patterns**
```tsx
// Hover-enabled cards
<Card className="hover:shadow-md transition-all group">
  <CardContent className="p-3">
    {/* Content */}
  </CardContent>
</Card>

// Action buttons appear on hover
<Button className="opacity-0 group-hover:opacity-100 transition-opacity">
  {/* Action */}
</Button>
```

### **Common Elements**
- **Search**: `<Search />` icon with `pl-10 h-8` input
- **Buttons**: `size="sm"` standard, `variant="ghost"` for secondary
- **Badges**: `text-xs px-1 py-0` for compact display
- **Loading**: `<Loader2 className="h-4 w-4 animate-spin" />`

---

## Quick Reference

### **3-Layer Checklist**

#### Layer 1: Main Menu ✅
- [ ] Gradient header: `bg-gradient-to-r from-slate-50 to-slate-100`
- [ ] Well-spaced cards: `space-y-4`
- [ ] Blue icon backgrounds: `bg-blue-100`
- [ ] Feature stats in header

#### Layer 2: Submenu (When Needed)
- [ ] Only when logical choices required
- [ ] Back button with gradient header style
- [ ] Card-based selection interface

#### Layer 3: Work Layer ✅
- [ ] **Navbar**: All work components use unified Navbar
- [ ] **Container**: `flex-1 p-4 overflow-auto`
- [ ] **Content**: `max-w-4xl mx-auto space-y-4`
- [ ] **Cards**: `p-3` content, hover effects

### **Component Standards**
- **Buttons**: `size="sm"` (h-8) standard
- **Icons**: `h-4 w-4` standard, `h-3 w-3` small
- **Search**: Height `h-8` with left icon
- **Badges**: `text-xs px-1 py-0` compact
- **Status Indicators**: Colored dots + text

### **Recent Changes (v2.0)**
- ✅ **PDF Processor**: Converted to proper work layer with Navbar
- ✅ **Status Integration**: PDF status moved from header to work card
- ✅ **Spacing Consistency**: All work layers use `p-4 space-y-4`
- ✅ **Navigation Unification**: All work layers follow same Navbar pattern

---

## Version History

- **v2.0** (2025-08-26) - **3-Layer Architecture & Work Layer Consistency**
  - Defined clear 3-layer architecture (MainMenu → Optional Submenu → Work Layer)
  - Standardized work layer design with unified Navbar integration
  - Fixed PDF Processor design inconsistencies
  - Simplified documentation, removed outdated complexity
- **v1.1** (2025-08-22) - Added unified navigation system 
- **v1.0** (2025) - Initial design system documentation

---

*Simplified design system focused on the proven 3-layer architecture. Work layers provide consistent, professional interfaces while MainMenu and optional submenus handle navigation choices clearly.*