import axios from 'axios';
import {
  PDFProcessingErrorResponse,
  PDFErrorCode,
  PDFProcessingResult,
  DefaultErrorMessages
} from '../types/errors';

interface ProcessedVersenyszam {
  nev: string;
  munem: string;
  hajoosztaly: string;
  nem: string;
  korosztaly: string;
  tav: string;
  [key: string]: any;
}

interface PDFProcessorResult {
  success: boolean;
  data?: ProcessedVersenyszam[];
  error?: string;
  errorCode?: PDFErrorCode;
  userMessage?: string;
}

/**
 * PDF Processor Service for Renderer Process
 *
 * This service handles PDF processing operations in the renderer process
 * by communicating with the main process via IPC calls. All child process
 * management and file system operations are handled in the main process.
 */
export class PDFProcessorService {
  private baseUrl: string = 'http://localhost:8081';

  constructor() {
    console.log('PDF processor service initialized (renderer)');
  }

  /**
   * Start the PDF processor (delegates to main process)
   */
  async start(): Promise<void> {
    const result = await window.electronAPI.pdfStart();
    if (!result.success) {
      throw new Error(result.error || 'Failed to start PDF processor');
    }
  }

  /**
   * Stop the PDF processor (delegates to main process)
   */
  async stop(): Promise<void> {
    const result = await window.electronAPI.pdfStop();
    if (!result.success) {
      throw new Error(result.error || 'Failed to stop PDF processor');
    }
  }

  /**
   * Check if the processor is ready to accept requests (delegates to main process)
   */
  async isProcessorReady(): Promise<boolean> {
    return await window.electronAPI.pdfIsReady();
  }

  /**
   * Process a PDF file and extract competition data (delegates to main process)
   */
  async processPDF(pdfFilePath: string): Promise<PDFProcessorResult> {
    return await window.electronAPI.pdfProcess(pdfFilePath);
  }

  /**
   * Download sample PDF document for user reference
   * Uses the main backend's static resource controller
   *
   * @returns Promise with download result including file path or error
   */
  async downloadSamplePDF(): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      // Use IPC to download file to user's Downloads folder
      // This will be handled by the main process which has file system access
      const result = await window.electronAPI.downloadSamplePDF();

      if (result.success) {
        console.log(`Sample PDF downloaded successfully to: ${result.filePath}`);
        return {
          success: true,
          filePath: result.filePath
        };
      } else {
        console.error('Sample PDF download failed:', result.error);
        return {
          success: false,
          error: result.error || 'A minta PDF letöltése sikertelen'
        };
      }
    } catch (error) {
      console.error('Error downloading sample PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt a letöltés során'
      };
    }
  }

  /**
   * Get information about the sample PDF without downloading it
   * Useful for checking availability and showing file details
   */
  async getSamplePDFInfo(): Promise<{
    success: boolean;
    info?: {
      filename: string;
      sizeBytes: number;
      description: string;
      formatYear: string;
    };
    error?: string;
  }> {
    try {
      // Get the main backend URL (assuming it runs on port 8080)
      const backendUrl = 'http://localhost:8080';

      const response = await axios.get(`${backendUrl}/api/static/sample-pdf/info`, {
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          success: true,
          info: response.data
        };
      } else {
        return {
          success: false,
          error: 'A minta PDF információk nem elérhetők'
        };
      }
    } catch (error) {
      console.error('Error getting sample PDF info:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'A backend szolgáltatás nem elérhető'
          };
        } else if (error.response?.status === 404) {
          return {
            success: false,
            error: 'A minta PDF nem található'
          };
        }
      }

      return {
        success: false,
        error: 'Hiba történt a minta PDF információk lekérdezése során'
      };
    }
  }

  /**
   * Get the current status of the processor (delegates to main process)
   */
  async getStatus() {
    return await window.electronAPI.pdfGetStatus();
  }
}

// Singleton instance
export const pdfProcessorService = new PDFProcessorService();