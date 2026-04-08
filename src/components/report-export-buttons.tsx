'use client'

import { FileDown, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ReportExportButtonsProps {
  onExportExcel?: () => void
  onExportPDF?: () => void
  isLoading?: boolean
  showExcel?: boolean
  showPDF?: boolean
}

export function ReportExportButtons({
  onExportExcel,
  onExportPDF,
  isLoading = false,
  showExcel = true,
  showPDF = true,
}: ReportExportButtonsProps) {
  // If only one export option, show single button
  if (showExcel && !showPDF) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={isLoading || !onExportExcel}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    )
  }

  if (showPDF && !showExcel) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPDF}
        disabled={isLoading || !onExportPDF}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
    )
  }

  // Both options - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showExcel && (
          <DropdownMenuItem
            onClick={onExportExcel}
            disabled={!onExportExcel}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export ke Excel
          </DropdownMenuItem>
        )}
        {showPDF && (
          <DropdownMenuItem
            onClick={onExportPDF}
            disabled={!onExportPDF}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export ke PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Individual export buttons (if you want separate buttons instead of dropdown)
export function ExportExcelButton({
  onClick,
  isLoading = false,
}: {
  onClick?: () => void
  isLoading?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading || !onClick}
    >
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  )
}

export function ExportPDFButton({
  onClick,
  isLoading = false,
}: {
  onClick?: () => void
  isLoading?: boolean
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading || !onClick}
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  )
}
