import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../ui/alert-dialog';
import { ReleaseInfo } from '../../features/common/services/UpdateService';

interface UpdateNotificationDialogProps {
  isOpen: boolean;
  releaseInfo: ReleaseInfo;
  onDownload: () => void;
  onSkipVersion: () => void;
  onClose: () => void;
}

const UpdateNotificationDialog: React.FC<UpdateNotificationDialogProps> = ({
  isOpen,
  releaseInfo,
  onDownload,
  onSkipVersion,
  onClose,
}) => {
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    const fetchCurrentVersion = async () => {
      try {
        const version = await window.electronAPI.getCurrentVersion();
        setCurrentVersion(version);
      } catch (error) {
        console.error('Failed to get current version:', error);
      }
    };

    if (isOpen) {
      fetchCurrentVersion();
    }
  }, [isOpen]);

  const handleDownload = () => {
    onDownload();
    onClose();
  };

  const handleSkipVersion = () => {
    onSkipVersion();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Új verzió elérhető! 🎉</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <div className="text-sm">
              <span className="font-semibold">Jelenlegi verzió:</span>{' '}
              <span className="text-muted-foreground">{currentVersion}</span>
            </div>

            <div className="text-sm">
              <span className="font-semibold">Új verzió:</span>{' '}
              <span className="text-primary font-semibold">{releaseInfo.version}</span>
            </div>

            {releaseInfo.releaseName && (
              <div className="text-sm">
                <span className="font-semibold">Kiadás neve:</span>{' '}
                <span className="text-muted-foreground">{releaseInfo.releaseName}</span>
              </div>
            )}

            {releaseInfo.releaseNotes && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-semibold mb-2">Változások:</p>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap pr-2">
                    {releaseInfo.releaseNotes}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>
                Kiadva: {releaseInfo.publishedAt.toLocaleDateString('hu-HU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <button
                onClick={async () => {
                  try {
                    await window.electronAPI.openExternalUrl(releaseInfo.releaseUrl);
                  } catch (error) {
                    console.error('Failed to open release page:', error);
                  }
                }}
                className="text-primary hover:underline font-medium"
              >
                Teljes kiadási jegyzék →
              </button>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleSkipVersion} className="w-full sm:w-auto">
            Verzió kihagyása
          </AlertDialogCancel>
          <AlertDialogCancel onClick={onClose} className="w-full sm:w-auto">
            Később
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDownload} className="w-full sm:w-auto">
            Letöltés
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpdateNotificationDialog;
