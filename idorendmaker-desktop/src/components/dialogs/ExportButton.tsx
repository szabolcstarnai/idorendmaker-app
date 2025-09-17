import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Download, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ExportButtonProps {
  scheduleId: number | null
  scheduleName?: string
  onExportSuccess?: (filename: string) => void
  onExportError?: (error: string) => void
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
}

const ExportButton: React.FC<ExportButtonProps> = ({
  scheduleId,
  scheduleName = 'Időrend',
  onExportSuccess,
  onExportError,
  className,
  variant = 'default',
  size = 'default',
  disabled = false
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleExport = async () => {
    if (!scheduleId || isExporting || disabled) return

    setIsExporting(true)
    setExportStatus('idle')

    try {
      // Call the export function via IPC
      const result = await window.electronAPI.exportScheduleToExcel(scheduleId, scheduleName)
      
      if (result.success) {
        setExportStatus('success')
        onExportSuccess?.(result.filename)
        
        // Reset success status after 2 seconds
        setTimeout(() => {
          setExportStatus('idle')
        }, 2000)
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus('error')
      onExportError?.(error instanceof Error ? error.message : 'Ismeretlen hiba történt')
      
      // Reset error status after 3 seconds
      setTimeout(() => {
        setExportStatus('idle')
      }, 3000)
    } finally {
      setIsExporting(false)
    }
  }

  const getButtonIcon = () => {
    if (isExporting) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    
    switch (exportStatus) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <FileSpreadsheet className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    if (isExporting) return 'Exportálás...'
    
    switch (exportStatus) {
      case 'success':
        return 'Exportálva!'
      case 'error':
        return 'Hiba történt'
      default:
        return 'Excel Export'
    }
  }

  const getButtonVariant = () => {
    if (exportStatus === 'success') return 'default'
    if (exportStatus === 'error') return 'destructive'
    return variant
  }

  const isButtonDisabled = disabled || !scheduleId || isExporting

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Button
        onClick={handleExport}
        disabled={isButtonDisabled}
        variant={getButtonVariant()}
        size={size}
        className={cn(
          'transition-all duration-200',
          exportStatus === 'success' && 'bg-green-600 hover:bg-green-700',
          exportStatus === 'error' && 'bg-red-600 hover:bg-red-700'
        )}
      >
        {getButtonIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </Button>
      
      {/* Info badge showing schedule status */}
      {scheduleId && !isExporting && exportStatus === 'idle' && (
        <Badge variant="secondary" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          {scheduleName}
        </Badge>
      )}
      
      {/* Success message */}
      {exportStatus === 'success' && (
        <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
          Sikeres exportálás
        </Badge>
      )}
      
      {/* Error message */}
      {exportStatus === 'error' && (
        <Badge variant="destructive" className="text-xs">
          Export hiba
        </Badge>
      )}
      
      {/* Disabled state info */}
      {!scheduleId && !disabled && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Mentse el az időrendet
        </Badge>
      )}
    </div>
  )
}

export { ExportButton }
export type { ExportButtonProps }