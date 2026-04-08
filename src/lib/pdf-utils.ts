import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

interface PDFHeader {
  title: string
  subtitle?: string
  dateRange?: {
    start: number
    end: number
  }
  branch?: string
}

interface PDFColumn {
  header: string
  dataKey: string
  width?: number
}

interface PDFOptions {
  orientation?: 'portrait' | 'landscape'
  fontSize?: number
  showPageNumbers?: boolean
  showTimestamp?: boolean
}

/**
 * Format nilai berdasarkan tipe data
 */
function formatValue(value: any, column: string): string {
  if (value === null || value === undefined) return '-'

  // Currency fields
  if (column.includes('total') || column.includes('revenue') ||
      column.includes('credit') || column.includes('amount') ||
      column.includes('price') || column.includes('cost') ||
      column.includes('discount') || column.includes('paid')) {
    return formatCurrency(Number(value))
  }

  // Date fields (unix timestamp)
  if (column.includes('date') && typeof value === 'number' && value > 1000000000) {
    return formatDate(value)
  }

  // Percentage fields
  if (column.includes('percent') || column.includes('rate')) {
    return `${Number(value).toFixed(2)}%`
  }

  return String(value)
}

/**
 * Generate PDF from report data
 */
export function generateReportPDF(
  header: PDFHeader,
  columns: PDFColumn[],
  data: any[],
  options: PDFOptions = {}
) {
  const {
    orientation = 'portrait',
    fontSize = 10,
    showPageNumbers = true,
    showTimestamp = true,
  } = options

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 15

  // Add header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(header.title, pageWidth / 2, yPos, { align: 'center' })
  yPos += 7

  if (header.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(header.subtitle, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
  }

  // Add date range
  if (header.dateRange) {
    doc.setFontSize(10)
    doc.text(
      `Periode: ${formatDate(header.dateRange.start)} - ${formatDate(header.dateRange.end)}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    yPos += 5
  }

  // Add branch
  if (header.branch) {
    doc.text(`Cabang: ${header.branch}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  // Add generation timestamp
  if (showTimestamp) {
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    yPos += 8
    doc.setTextColor(0, 0, 0)
  } else {
    yPos += 3
  }

  // Prepare table data
  const tableColumns = columns.map((col) => ({
    header: col.header,
    dataKey: col.dataKey,
  }))

  const tableData = data.map((row) => {
    const formattedRow: any = {}
    columns.forEach((col) => {
      formattedRow[col.dataKey] = formatValue(row[col.dataKey], col.dataKey)
    })
    return formattedRow
  })

  // Add table
  autoTable(doc, {
    startY: yPos,
    head: [tableColumns.map((col) => col.header)],
    body: tableData.map((row) => columns.map((col) => row[col.dataKey])),
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: fontSize,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: fontSize - 1,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Add page numbers
      if (showPageNumbers) {
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        const pageNum = doc.internal.pages.length - 1
        doc.text(
          `Halaman ${pageNum}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.setTextColor(0, 0, 0)
      }

      // Add company watermark (optional)
      doc.setFontSize(40)
      doc.setTextColor(200, 200, 200)
      doc.text('SHOESFAST', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      })
      doc.setTextColor(0, 0, 0)
    },
  })

  return doc
}

/**
 * Generate and download PDF
 */
export function downloadReportPDF(
  filename: string,
  header: PDFHeader,
  columns: PDFColumn[],
  data: any[],
  options?: PDFOptions
) {
  const doc = generateReportPDF(header, columns, data, options)
  doc.save(`${filename}.pdf`)
}

/**
 * Generate PDF with summary section
 */
export function generateReportPDFWithSummary(
  header: PDFHeader,
  summary: { label: string; value: string | number }[],
  columns: PDFColumn[],
  data: any[],
  options: PDFOptions = {}
) {
  const {
    orientation = 'portrait',
    fontSize = 10,
    showPageNumbers = true,
    showTimestamp = true,
  } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 15

  // Add header (same as before)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(header.title, pageWidth / 2, yPos, { align: 'center' })
  yPos += 7

  if (header.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(header.subtitle, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
  }

  if (header.dateRange) {
    doc.setFontSize(10)
    doc.text(
      `Periode: ${formatDate(header.dateRange.start)} - ${formatDate(header.dateRange.end)}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    yPos += 5
  }

  if (header.branch) {
    doc.text(`Cabang: ${header.branch}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }

  if (showTimestamp) {
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    yPos += 8
    doc.setTextColor(0, 0, 0)
  } else {
    yPos += 3
  }

  // Add summary section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan', 15, yPos)
  yPos += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  summary.forEach((item) => {
    const formattedValue = typeof item.value === 'number' && item.label.toLowerCase().includes('total')
      ? formatCurrency(item.value)
      : String(item.value)

    doc.text(`${item.label}:`, 20, yPos)
    doc.setFont('helvetica', 'bold')
    doc.text(formattedValue, pageWidth - 20, yPos, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    yPos += 5
  })

  yPos += 5

  // Add separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(15, yPos, pageWidth - 15, yPos)
  yPos += 8

  // Add table
  const tableColumns = columns.map((col) => ({
    header: col.header,
    dataKey: col.dataKey,
  }))

  const tableData = data.map((row) => {
    const formattedRow: any = {}
    columns.forEach((col) => {
      formattedRow[col.dataKey] = formatValue(row[col.dataKey], col.dataKey)
    })
    return formattedRow
  })

  autoTable(doc, {
    startY: yPos,
    head: [tableColumns.map((col) => col.header)],
    body: tableData.map((row) => columns.map((col) => row[col.dataKey])),
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: fontSize,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: fontSize - 1,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      if (showPageNumbers) {
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        const pageNum = doc.internal.pages.length - 1
        doc.text(
          `Halaman ${pageNum}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.setTextColor(0, 0, 0)
      }

      doc.setFontSize(40)
      doc.setTextColor(200, 200, 200)
      doc.text('SHOESFAST', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
      })
      doc.setTextColor(0, 0, 0)
    },
  })

  return doc
}

/**
 * Download PDF with summary
 */
export function downloadReportPDFWithSummary(
  filename: string,
  header: PDFHeader,
  summary: { label: string; value: string | number }[],
  columns: PDFColumn[],
  data: any[],
  options?: PDFOptions
) {
  const doc = generateReportPDFWithSummary(header, summary, columns, data, options)
  doc.save(`${filename}.pdf`)
}
