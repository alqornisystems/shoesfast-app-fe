/**
 * Export utilities for reports
 * Handles Excel export and Print functionality
 */

// Export to Excel using simple CSV format
export function exportToExcel(data: any[], filename: string, headers: string[]) {
  // Convert data to CSV format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header] ?? ''
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""')
        return escaped.includes(',') ? `"${escaped}"` : escaped
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export table to Excel from table data
export function exportTableToExcel(
  tableData: Record<string, any>[],
  columns: { key: string; label: string; format?: (value: any) => string }[],
  filename: string
) {
  const headers = columns.map(col => col.label)
  const rows = tableData.map(row => {
    const formatted: Record<string, any> = {}
    columns.forEach(col => {
      const value = row[col.key]
      formatted[col.label] = col.format ? col.format(value) : value
    })
    return formatted
  })

  exportToExcel(rows, filename, headers)
}

// Print handler
export function handlePrint(title: string) {
  window.print()
}

// Format currency for export
export function formatCurrencyForExport(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date for export
export function formatDateForExport(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// Format percentage for export
export function formatPercentForExport(value: number): string {
  return `${value}%`
}
