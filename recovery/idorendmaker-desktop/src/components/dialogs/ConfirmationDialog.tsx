import React from 'react';
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning';
  icon?: React.ReactNode;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Megerősítés",
  cancelLabel = "Mégse",
  variant = 'destructive',
  icon
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          iconColor: 'text-red-500',
          buttonVariant: 'destructive' as const,
          defaultIcon: <Trash2 className="h-5 w-5" />
        };
      case 'warning':
        return {
          iconColor: 'text-amber-500',
          buttonVariant: 'default' as const,
          defaultIcon: <AlertTriangle className="h-5 w-5" />
        };
      default:
        return {
          iconColor: 'text-amber-500',
          buttonVariant: 'destructive' as const,
          defaultIcon: <AlertTriangle className="h-5 w-5" />
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md w-[95vw]">
        <AlertDialogHeader className="space-y-3">
          <AlertDialogTitle className="flex items-center gap-2 text-lg">
            <span className={`flex-shrink-0 ${styles.iconColor}`}>
              {icon || styles.defaultIcon}
            </span>
            <span className="break-words">{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed break-words">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-row gap-2 pt-4">
          {/* Cancel */}
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onClose} className="w-full justify-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {cancelLabel}
            </Button>
          </AlertDialogCancel>

          {/* Confirm */}
          <Button
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            className="w-full justify-center"
          >
            {icon || styles.defaultIcon}
            <span className="ml-2">{confirmLabel}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;