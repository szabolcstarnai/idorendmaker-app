import React, { useState } from 'react';
import { AlertTriangle, Download, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { toast } from 'sonner';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { pdfProcessorService } from '../../features/pdf';
import { ErrorHelpContent, GeneralHelpContent } from '../../features/pdf/constants/helpContent';
import { PDFErrorCode } from '../../features/pdf/types/errors';

interface PDFErrorDisplayProps {
  error: string;
  errorCode?: PDFErrorCode;
  userMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export const PDFErrorDisplay: React.FC<PDFErrorDisplayProps> = ({
  error,
  errorCode,
  userMessage,
  onRetry,
  className
}) => {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Get help content for the specific error type
  const helpContent = errorCode ? ErrorHelpContent[errorCode] : null;

  // Determine error severity and styling
  const isFileTypeError = errorCode === 'INVALID_FILE_TYPE';
  const isServiceError = !errorCode || ['PROCESSING_ERROR', 'CORRUPTED_FILE_ERROR'].includes(errorCode as PDFErrorCode);

  const cardClasses = isServiceError
    ? "border-red-200 bg-red-50"
    : "border-amber-200 bg-amber-50";

  const iconClasses = isServiceError
    ? "text-red-600"
    : "text-amber-600";

  const textClasses = isServiceError
    ? "text-red-900"
    : "text-amber-900";

  const subtextClasses = isServiceError
    ? "text-red-800"
    : "text-amber-800";

  // Handle sample PDF download
  const handleDownloadSample = async () => {
    setIsDownloading(true);
    try {
      const result = await pdfProcessorService.downloadSamplePDF();

      if (result.success) {
        toast.success(`Minta PDF letöltve: ${result.filePath}`);
      } else {
        toast.error(result.error || 'A letöltés sikertelen');
      }
    } catch (error) {
      console.error('Sample PDF download error:', error);
      toast.error('Hiba történt a letöltés során');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className={`${cardClasses} ${className}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${iconClasses} mt-0.5 flex-shrink-0`} />
          <div className="space-y-3 flex-1">
            {/* Error message */}
            <div>
              <p className={`font-medium ${textClasses}`}>
                {userMessage || error}
              </p>
              {helpContent && (
                <p className={`text-sm ${subtextClasses} mt-1`}>
                  {helpContent.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Sample download button for format errors */}
              {(errorCode === 'PDF_FORMAT_ERROR' || errorCode === 'INVALID_CONTENT_ERROR') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  disabled={isDownloading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? 'Letöltés...' : 'Minta dokumentum letöltése'}
                </Button>
              )}

              {/* Retry button */}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gap-2"
                >
                  Próbálkozás újra
                </Button>
              )}

              {/* Help toggle button */}
              {helpContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                  className="gap-2"
                >
                  <HelpCircle className="h-4 w-4" />
                  {isHelpExpanded ? 'Segítség bezárása' : 'További segítség'}
                  {isHelpExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Expandable help section */}
            {helpContent && (
              <Collapsible open={isHelpExpanded} onOpenChange={setIsHelpExpanded}>
                <CollapsibleContent className="space-y-4 mt-4 p-4 bg-white/50 rounded-lg border border-amber-100">
                  {/* Requirements */}
                  {helpContent.requirements && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-2">
                        Követelmények:
                      </h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {helpContent.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Steps */}
                  {helpContent.steps && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 mb-2">
                        Megoldási lépések:
                      </h4>
                      <ol className="text-sm text-gray-700 space-y-1">
                        {helpContent.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600 font-medium mt-0.5 min-w-[1.25rem]">
                              {index + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Additional info */}
                  {helpContent.additionalInfo && (
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                      <p>{helpContent.additionalInfo}</p>
                    </div>
                  )}

                  {/* Sample PDF info for relevant errors */}
                  {(errorCode === 'PDF_FORMAT_ERROR' || errorCode === 'INVALID_CONTENT_ERROR') && (
                    <div className="pt-2 border-t border-amber-200">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">
                        {GeneralHelpContent.samplePDFInfo.title}
                      </h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {GeneralHelpContent.samplePDFInfo.description}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSample}
                        disabled={isDownloading}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {GeneralHelpContent.samplePDFInfo.buttonText}
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFErrorDisplay;