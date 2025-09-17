import React from 'react';
import { AlertTriangle, Save, X, ArrowLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndExit?: () => Promise<void> | void;
  onExitWithoutSaving: () => void;
  title?: string;
  description?: string;
  canSave?: boolean;
  saveLabel?: string;
}

const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  onClose,
  onSaveAndExit,
  onExitWithoutSaving,
  title = "Mentetlen módosítások",
  description = "Mentetlen módosítások vannak. Biztosan el szeretné hagyni az oldalt?",
  canSave = true,
  saveLabel = "Mentés és kilépés"
}) => {
  const handleSaveAndExit = async () => {
    if (onSaveAndExit) {
      await onSaveAndExit();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-2xl w-[95vw] max-h-[90vh]">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <span className="break-words">{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed break-words">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col gap-3 pt-4">
          <div className="flex flex-row gap-2 w-full">
            {/* Cancel - stay on current page */}
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={onClose} className="w-full justify-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mégse
              </Button>
            </AlertDialogCancel>

            {/* Exit without saving */}
            <Button
              variant="destructive"
              onClick={onExitWithoutSaving}
              className="w-full justify-center"
            >
              <X className="h-4 w-4 mr-2" />
              Kilépés mentés nélkül
            </Button>

            {/* Save and exit - only show if save function is provided and saving is possible */}
            {canSave && onSaveAndExit && (
              <AlertDialogAction asChild>
                <Button
                  variant="default"
                  onClick={handleSaveAndExit}
                  className="w-full justify-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveLabel}
                </Button>
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;