import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Loader2, FileSpreadsheet } from 'lucide-react'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

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

  const handleExport = async () => {
    if (!scheduleId || isExporting || disabled) return

    setIsExporting(true)

    try {
      // Call the export function via IPC
      const result = await window.electronAPI.exportScheduleToExcel(scheduleId, scheduleName)

      if (result.success) {
        toast.success(`Excel exportálás sikeres: ${result.filename}`)
        onExportSuccess?.(result.filename)
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      toast.error(`Export hiba: ${errorMessage}`)
      onExportError?.(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const getButtonIcon = () => {
    if (isExporting) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    return <FileSpreadsheet className="h-4 w-4" />
  }

  const getButtonText = () => {
    return isExporting ? 'Exportálás...' : 'Excel Export'
  }

  const isButtonDisabled = disabled || !scheduleId || isExporting

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <Button
        onClick={handleExport}
        disabled={isButtonDisabled}
        variant={variant}
        size={size}
        className="transition-all duration-200 w-full"
      >
        {getButtonIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </Button>

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