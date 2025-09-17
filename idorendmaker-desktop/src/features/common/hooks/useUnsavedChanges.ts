import { useState, useCallback } from 'react';

export type UnsavedChangesType = 'schedule' | 'rule';

interface UnsavedChangesState {
  hasChanges: boolean;
  type: UnsavedChangesType | null;
  saveFunction?: () => Promise<void> | void;
  canSave?: boolean;
}

interface UseUnsavedChangesReturn {
  // State
  hasUnsavedChanges: boolean;
  showConfirmDialog: boolean;
  unsavedChangesType: UnsavedChangesType | null;
  canSave: boolean;
  
  // Actions
  setUnsavedChanges: (hasChanges: boolean, type?: UnsavedChangesType, saveFunction?: () => Promise<void> | void, canSave?: boolean) => void;
  requestNavigation: (navigationAction: () => void) => void;
  handleSaveAndExit: () => Promise<void>;
  handleExitWithoutSaving: () => void;
  handleCancelNavigation: () => void;
}

/**
 * Custom hook for managing unsaved changes confirmation
 * Provides a unified interface for warning users about unsaved data
 */
export const useUnsavedChanges = (): UseUnsavedChangesReturn => {
  const [unsavedState, setUnsavedState] = useState<UnsavedChangesState>({
    hasChanges: false,
    type: null,
    canSave: true
  });
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Set unsaved changes state
  const setUnsavedChanges = useCallback((
    hasChanges: boolean, 
    type?: UnsavedChangesType, 
    saveFunction?: () => Promise<void> | void,
    canSave: boolean = true
  ) => {
    setUnsavedState({
      hasChanges,
      type: hasChanges ? (type || null) : null,
      saveFunction: hasChanges ? saveFunction : undefined,
      canSave: hasChanges ? canSave : true
    });
  }, []);

  // Request navigation - will show confirmation if there are unsaved changes
  const requestNavigation = useCallback((navigationAction: () => void) => {
    if (unsavedState.hasChanges) {
      setPendingNavigation(() => navigationAction);
      setShowConfirmDialog(true);
    } else {
      // No unsaved changes, navigate immediately
      navigationAction();
    }
  }, [unsavedState.hasChanges]);

  // Handle save and exit
  const handleSaveAndExit = useCallback(async () => {
    try {
      if (unsavedState.saveFunction) {
        await unsavedState.saveFunction();
      }
      
      // Clear unsaved state
      setUnsavedState({
        hasChanges: false,
        type: null,
        canSave: true
      });
      
      // Execute pending navigation
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
      
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error saving before navigation:', error);
      // Don't navigate if save failed
    }
  }, [unsavedState.saveFunction, pendingNavigation]);

  // Handle exit without saving
  const handleExitWithoutSaving = useCallback(() => {
    // Clear unsaved state
    setUnsavedState({
      hasChanges: false,
      type: null,
      canSave: true
    });
    
    // Execute pending navigation
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
    
    setShowConfirmDialog(false);
  }, [pendingNavigation]);

  // Handle cancel navigation
  const handleCancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  }, []);

  return {
    hasUnsavedChanges: unsavedState.hasChanges,
    showConfirmDialog,
    unsavedChangesType: unsavedState.type,
    canSave: unsavedState.canSave && !!unsavedState.saveFunction,
    setUnsavedChanges,
    requestNavigation,
    handleSaveAndExit,
    handleExitWithoutSaving,
    handleCancelNavigation
  };
};