export interface PDFProcessingErrorResponse {
  errorCode: string;
  message: string;
  userMessage: string;
}

export type PDFErrorCode =
  | 'PDF_FORMAT_ERROR'
  | 'EMPTY_FILE_ERROR'
  | 'CORRUPTED_FILE_ERROR'
  | 'PROCESSING_ERROR'
  | 'INVALID_CONTENT_ERROR'
  | 'INVALID_FILE_TYPE';

export interface PDFProcessingResult {
  success: boolean;
  data?: any[];
  error?: string;
  errorCode?: PDFErrorCode;
  userMessage?: string;
}

export const DefaultErrorMessages: Record<PDFErrorCode, string> = {
  PDF_FORMAT_ERROR: 'A kiválasztott fájl formátuma nem megfelelő. A szolgáltatás a hivatalos MKKSZ Kajak-Kenu Ablakból exportált NEVEZÉSEK - VERSENYSZÁMONKÉNT PDF dokumentumból tud adatot kinyerni.',
  EMPTY_FILE_ERROR: 'A kiválasztott fájl üres vagy nem tartalmaz feldolgozható adatokat.',
  CORRUPTED_FILE_ERROR: 'A kiválasztott PDF fájl sérült vagy nem olvasható. Kérjük, próbáljon meg egy másik fájlt.',
  PROCESSING_ERROR: 'Hiba történt a PDF feldolgozása során. Kérjük, ellenőrizze a fájl formátumát és próbálja újra.',
  INVALID_CONTENT_ERROR: 'A PDF nem tartalmazza a várt MKKSZ formátum szerkezetét. Kérjük, exportálja a dokumentumot a NEVEZÉSEK - VERSENYSZÁMONKÉNT funkcióval.',
  INVALID_FILE_TYPE: 'Csak PDF fájlokat lehet feldolgozni.'
};