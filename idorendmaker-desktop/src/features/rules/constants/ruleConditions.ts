// Rule condition dropdown values and field definitions

export interface FieldOption {
  value: string;
  label: string;
  description: string;
  hasDropdown: boolean;
  allowsMultiSelect: boolean;
}

export interface DropdownValue {
  value: string;
  label: string;
}

// Available fields for race conditions
export const CONDITION_FIELDS: FieldOption[] = [
  {
    value: "discipline",
    label: "Szakág",
    description: "pl. Kajak, Kenu, SUP",
    hasDropdown: true,
    allowsMultiSelect: true,
  },
  {
    value: "boatClass",
    label: "Hajóosztály",
    description: "pl. Kajak egyes, Kajak páros",
    hasDropdown: true,
    allowsMultiSelect: true,
  },
  {
    value: "gender",
    label: "Nem",
    description: "pl. Férfi, Női, Vegyes",
    hasDropdown: true,
    allowsMultiSelect: true,
  },
  {
    value: "distance",
    label: "Távolság",
    description: "pl. 500 m, 1000 m",
    hasDropdown: true,
    allowsMultiSelect: true,
  },
  {
    value: "ageGroups",
    label: "Korosztály",
    description: "pl. Serdülő - U15, Felnőtt",
    hasDropdown: true, // Populated from database
    allowsMultiSelect: true,
  },
  {
    value: "name",
    label: "Versenyszám neve",
    description: "pl. K1 Férfi Felnőtt 1000m",
    hasDropdown: false, // Free text input
    allowsMultiSelect: false,
  },
  {
    value: "level",
    label: "Futamszint",
    description: "pl. Döntő I., A Döntő, I. Előfutam",
    hasDropdown: true, // Populated from database
    allowsMultiSelect: true,
  },
  {
    value: "levelType",
    label: "Futamszint típus",
    description: "pl. döntő, előfutam, középfutam",
    hasDropdown: true,
    allowsMultiSelect: true,
  },
  {
    value: "boatType",
    label: "Hajóosztály típus",
    description: "pl. Kajak, Minikajak, Kenu",
    hasDropdown: true, // Populated from backend
    allowsMultiSelect: true,
  },
  {
    value: "seatCount",
    label: "Ülésszám",
    description: "pl. 1, 2, 4, csapat",
    hasDropdown: true, // Populated from backend
    allowsMultiSelect: true,
  },
];

// Discipline options
export const DISCIPLINE_OPTIONS: DropdownValue[] = [
  { value: "Kajak", label: "Kajak" },
  { value: "Kenu", label: "Kenu" },
  { value: "SUP", label: "SUP" },
  { value: "Kajakpóló", label: "Kajakpóló" },
  { value: "Parakenu", label: "Parakenu" },
  { value: "Sárkányhajó", label: "Sárkányhajó" },
  { value: "Szlalom", label: "Szlalom" },
  { value: "Tengeri kajak", label: "Tengeri kajak" },
];

// Boat class options
export const BOAT_CLASS_OPTIONS: DropdownValue[] = [
  { value: "Kajak egyes", label: "K1" },
  { value: "Kajak páros", label: "K2" },
  { value: "Kajak négyes", label: "K4" },
  { value: "Kajak váltó", label: "K1 váltó" },
  { value: "Kenu egyes", label: "C1" },
  { value: "Kenu páros", label: "C2" },
  { value: "Kenu négyes", label: "C4" },
  { value: "Kenu váltó", label: "C1 váltó" },
  { value: "Minikajak egyes", label: "MK1" },
  { value: "Minikajak páros", label: "MK2" },
  { value: "Minikajak négyes", label: "MK4" },
  { value: "Minikenu egyes", label: "MC1" },
  { value: "Portyakenu páros", label: "PC2" },
  { value: "Portyakenu négyes", label: "PC4" },
  { value: "Túrakenu négyes", label: "TC4" },
  { value: "Eszkimó kajak egyes", label: "EK1" },
  { value: "Kajakpóló csapat", label: "Kajakpóló" },
  { value: "SUP felfújható egyes", label: "SUP-Inf" },
  { value: "SUP merev egyes", label: "SUP-Hard" },
  { value: "Mini SUP felfujható egyes", label: "MSUP-Inf" },
  { value: "Parakajak KL1 (A)", label: "KL1 (A)" },
  { value: "Parakajak KL2 (TA)", label: "KL2 (TA)" },
  { value: "Parakajak KL3 (LTA)", label: "KL3 (LTA)" },
  { value: "Parakenu VL1 (A)", label: "VL1 (A)" },
  { value: "Parakenu VL2 (TA)", label: "VL2 (TA)" },
  { value: "Parakenu VL3 (LTA)", label: "VL3 (LTA)" },
  { value: "Sárkányhajó 10", label: "DB10" },
  { value: "Sárkányhajó 20", label: "DB20" },
  { value: "Szlalom Kajak egyes", label: "SL-K1" },
  { value: "Szörfkajak", label: "Szörfkajak-SUP" },
];

// Gender options
export const GENDER_OPTIONS: DropdownValue[] = [
  { value: "Férfi", label: "Férfi" },
  { value: "Női", label: "Női" },
  { value: "Vegyes", label: "Vegyes" },
];

// Distance options
export const DISTANCE_OPTIONS: DropdownValue[] = [
  { value: "1000 m", label: "1000 m" },
  { value: "2000 m", label: "2000 m" },
  { value: "500 m", label: "500 m" },
  { value: "200 m", label: "200 m" },
  { value: "4000 m", label: "4000 m" },

  { value: "100 m", label: "100 m" },
  { value: "250 m", label: "250 m" },
  { value: "300 m", label: "300 m" },
  { value: "400 m", label: "400 m" },
  { value: "700 m", label: "700 m" },
  { value: "800 m", label: "800 m" },

  { value: "3000 m", label: "3000 m" },
  { value: "3 km", label: "3 km" },
  { value: "3,6 km", label: "3,6 km" },
  { value: "4500 m", label: "4500 m" },
  { value: "5000 m", label: "5000 m" },
  { value: "5 km", label: "5 km" },
  { value: "6000 m", label: "6000 m" },
  { value: "6 km", label: "6 km" },
  { value: "7 km", label: "7 km" },
  { value: "8 km", label: "8 km" },
  { value: "8,2 km", label: "8,2 km" },
  { value: "9000 m", label: "9000 m" },
  { value: "10 km", label: "10 km" },
  { value: "10,6 km", label: "10,6 km" },
  { value: "11 km", label: "11 km" },
  { value: "11,1 km", label: "11,1 km" },
  { value: "11,5 km", label: "11,5 km" },
  { value: "11,8 km", label: "11,8 km" },
  { value: "12 km", label: "12 km" },
  { value: "14 km", label: "14 km" },
  { value: "14,3 km", label: "14,3 km" },
  { value: "14,4 km", label: "14,4 km" },
  { value: "14,5 km", label: "14,5 km" },
  { value: "15 km", label: "15 km" },
  { value: "15,4 km", label: "15,4 km" },
  { value: "16 km", label: "16 km" },
  { value: "17 km", label: "17 km" },
  { value: "17,7 km", label: "17,7 km" },
  { value: "18 km", label: "18 km" },
  { value: "19 km", label: "19 km" },
  { value: "20 km", label: "20 km" },
  { value: "21 km (síkvíz)", label: "21 km (síkvíz)" },
  { value: "21 km", label: "21 km" },
  { value: "21,7 km", label: "21,7 km" },
  { value: "22 km", label: "22 km" },
  { value: "22,6 km", label: "22,6 km" },
  { value: "24,3 km", label: "24,3 km" },
  { value: "25,5 km", label: "25,5 km" },
  { value: "26 km", label: "26 km" },
  { value: "26,2 km", label: "26,2 km" },
  { value: "27,6 km", label: "27,6 km" },
  { value: "29,2 km", label: "29,2 km" },
  { value: "29,8 km", label: "29,8 km" },
  { value: "30 km", label: "30 km" },
  { value: "45 km", label: "45 km" },
  { value: "75 km", label: "75 km" },
];

// Level type options
export const LEVEL_TYPE_OPTIONS: DropdownValue[] = [
  { value: "döntő", label: "Döntő" },
  { value: "előfutam", label: "Előfutam" },
  { value: "középfutam", label: "Középfutam" },
];

// Available operators
export const OPERATORS = [
  { value: "equals", label: "egyenlő (=)", description: "Pontos egyezés" },
  {
    value: "not_equals",
    label: "nem egyenlő (≠)",
    description: "Kizáró feltétel",
  },
  {
    value: "in",
    label: "bármelyik (több értékből)",
    description: "Több értékből bármelyik",
  },
  {
    value: "not_in",
    label: "egyik sem (több érték kizárása)",
    description: "A megadott értékek közül egyik sem",
  },
];

// Get dropdown options for a specific field
export function getDropdownOptions(field: string): DropdownValue[] {
  switch (field) {
    case "discipline":
      return DISCIPLINE_OPTIONS;
    case "boatClass":
      return BOAT_CLASS_OPTIONS;
    case "gender":
      return GENDER_OPTIONS;
    case "distance":
      return DISTANCE_OPTIONS;
    case "ageGroups":
      // This will be populated from database
      return [];
    case "levelType":
      return LEVEL_TYPE_OPTIONS;
    case "level":
      // This will be populated from database
      return [];
    case "boatType":
      // This will be populated from backend API
      return [];
    case "seatCount":
      // This will be populated from backend API
      return [];
    default:
      return [];
  }
}

// Check if field supports dropdown
export function fieldHasDropdown(field: string): boolean {
  const fieldDef = CONDITION_FIELDS.find((f) => f.value === field);
  return fieldDef?.hasDropdown || false;
}

// Check if field supports multi-select
export function fieldAllowsMultiSelect(field: string): boolean {
  const fieldDef = CONDITION_FIELDS.find((f) => f.value === field);
  return fieldDef?.allowsMultiSelect || false;
}
