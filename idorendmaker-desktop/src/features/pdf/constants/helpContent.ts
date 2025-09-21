import { PDFErrorCode } from '../types/errors';

export interface HelpContent {
  title: string;
  description: string;
  requirements?: string[];
  steps?: string[];
  additionalInfo?: string;
}

export const ErrorHelpContent: Record<PDFErrorCode, HelpContent> = {
  PDF_FORMAT_ERROR: {
    title: 'PDF formátum követelmények',
    description: 'A szolgáltatás csak a hivatalos MKKSZ Kajak-Kenu Ablak szoftverből exportált PDF dokumentumokat tudja feldolgozni.',
    requirements: [
      'MKKSZ Kajak-Kenu Ablak szoftverből exportált PDF',
      '"NEVEZÉSEK - VERSENYSZÁMONKÉNT" export formátum',
      'PDF fájl (.pdf kiterjesztés)',
      'Utolsó tesztelt formátum: 2025'
    ],
    steps: [
      'Nyissa meg a MKKSZ Kajak-Kenu Ablak szoftvert',
      'Válassza ki a versenyt',
      'Menü → Jelentések → NEVEZÉSEK - VERSENYSZÁMONKÉNT',
      'Exportálja PDF formátumban'
    ],
    additionalInfo: 'A minta dokumentum letöltésével megtekintheti a helyes formátum szerkezetét.'
  },

  EMPTY_FILE_ERROR: {
    title: 'Üres fájl',
    description: 'A kiválasztott fájl nem tartalmaz adatokat vagy nem olvasható.',
    requirements: [
      'A fájl mérete nagyobb legyen mint 0 byte',
      'A fájl ne legyen sérült',
      'A fájl olvasható legyen'
    ],
    steps: [
      'Ellenőrizze a fájl méretét',
      'Próbáljon meg egy másik PDF fájlt',
      'Győződjön meg róla, hogy a fájl teljesen letöltődött'
    ]
  },

  CORRUPTED_FILE_ERROR: {
    title: 'Sérült PDF fájl',
    description: 'A PDF fájl sérült vagy nem olvasható formátumú.',
    requirements: [
      'Érvényes PDF fájl',
      'Nem jelszóval védett dokumentum',
      'Nem sérült fájl struktúra'
    ],
    steps: [
      'Próbálja meg újra exportálni a PDF-et',
      'Ellenőrizze, hogy a fájl teljesen átmásolódott',
      'Nyissa meg a PDF-et más alkalmazásban ellenőrzésképpen',
      'Ha más alkalmazásban sem nyílik meg, a fájl valóban sérült'
    ]
  },

  PROCESSING_ERROR: {
    title: 'Feldolgozási hiba',
    description: 'Váratlan hiba történt a PDF feldolgozása során.',
    requirements: [
      'Helyes PDF formátum',
      'Megfelelő fájl méret (< 10MB)',
      'Stabil internetkapcsolat'
    ],
    steps: [
      'Próbálja újra a feldolgozást',
      'Ellenőrizze az internetkapcsolatot',
      'Ha a probléma továbbra is fennáll, próbáljon meg egy másik PDF fájlt'
    ]
  },

  INVALID_CONTENT_ERROR: {
    title: 'Hibás dokumentum szerkezet',
    description: 'A PDF nem tartalmazza a várt MKKSZ formátum szerkezetét.',
    requirements: [
      'MKKSZ Kajak-Kenu Ablak export',
      'NEVEZÉSEK - VERSENYSZÁMONKÉNT formátum',
      'Helyes táblázat fejlécek: "Azonosító", "Név", "Tagszervezet", "Született"',
      'Versenyszám nevekkel strukturált tartalom'
    ],
    steps: [
      'Ellenőrizze az export beállításokat a MKKSZ szoftverben',
      'Győződjön meg róla, hogy a "NEVEZÉSEK - VERSENYSZÁMONKÉNT" funkciót használja',
      'Hasonlítsa össze a dokumentumot a minta PDF-el',
      'Exportálja újra a dokumentumot a helyes beállításokkal'
    ],
    additionalInfo: 'A minta PDF megmutatja a várt dokumentum szerkezetet és a szükséges adatokat.'
  },

  INVALID_FILE_TYPE: {
    title: 'Hibás fájl típus',
    description: 'Csak PDF fájlokat lehet feldolgozni.',
    requirements: [
      'PDF fájl (.pdf kiterjesztés)',
      'Nem más dokumentum típus (Word, Excel, stb.)'
    ],
    steps: [
      'Válasszon ki egy PDF fájlt',
      'Ha a dokumentum más formátumban van, konvertálja PDF-be',
      'Ellenőrizze a fájl kiterjesztését'
    ]
  }
};

export const GeneralHelpContent = {
  samplePDFInfo: {
    title: 'Minta dokumentum',
    description: 'Letölthet egy minta PDF dokumentumot, amely bemutatja a helyes MKKSZ formátum szerkezetét.',
    buttonText: 'Minta dokumentum letöltése'
  },

  supportInfo: {
    title: 'További segítség',
    description: 'Ha továbbra is problémákat tapasztal, ellenőrizze a dokumentáció további részét vagy vegye fel a kapcsolatot a támogatással.'
  }
};