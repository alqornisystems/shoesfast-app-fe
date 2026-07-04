import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface InvoiceItem {
  name: string
  services: string // joined service/treatment names
  price: number
}

export interface InvoicePayment {
  date: number // unix seconds
  nominal: number
  note?: string | null
}

export interface InvoiceData {
  code: string
  date: number // order date, unix seconds
  dueDate?: number | null
  status: "paid" | "partial" | "unpaid"
  branchName?: string | null
  customer: {
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
  }
  items: InvoiceItem[]
  totalPrice: number
  totalPaid: number
  credit: number
  payments: InvoicePayment[]
}

const STATUS_LABEL: Record<InvoiceData["status"], string> = {
  paid: "LUNAS",
  partial: "CICILAN",
  unpaid: "BELUM BAYAR",
}

const STATUS_COLOR: Record<InvoiceData["status"], [number, number, number]> = {
  paid: [22, 163, 74],
  partial: [37, 99, 235],
  unpaid: [220, 38, 38],
}

function rupiah(n: number): string {
  return "Rp " + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function tanggal(unix?: number | null): string {
  if (!unix) return "-"
  return new Date(unix * 1000).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Build a printable A4 invoice for a payment/order.
 */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = 18

  // --- Company / branch (left) ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("SHOESFAST", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(110)
  if (data.branchName) {
    doc.text(data.branchName, margin, y)
    y += 5
  }
  doc.setTextColor(0)

  // --- Invoice meta (right) ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(41, 128, 185)
  doc.text("INVOICE", pageW - margin, 20, { align: "right" })
  doc.setTextColor(0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`No: ${data.code}`, pageW - margin, 27, { align: "right" })
  doc.text(`Tanggal: ${tanggal(data.date)}`, pageW - margin, 32, { align: "right" })
  let metaY = 37
  if (data.dueDate) {
    doc.text(`Jatuh Tempo: ${tanggal(data.dueDate)}`, pageW - margin, metaY, { align: "right" })
    metaY += 5
  }
  // Status, colored
  const sc = STATUS_COLOR[data.status]
  doc.setFont("helvetica", "bold")
  doc.setTextColor(sc[0], sc[1], sc[2])
  doc.text(`Status: ${STATUS_LABEL[data.status]}`, pageW - margin, metaY, { align: "right" })
  doc.setTextColor(0)
  doc.setFont("helvetica", "normal")

  y = Math.max(y, metaY) + 6
  doc.setDrawColor(220)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // --- Bill to ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Ditagihkan kepada:", margin, y)
  y += 5
  doc.setFont("helvetica", "normal")
  doc.text(data.customer.name || "-", margin, y)
  y += 5
  if (data.customer.phone) {
    doc.text(data.customer.phone, margin, y)
    y += 5
  }
  if (data.customer.email) {
    doc.text(data.customer.email, margin, y)
    y += 5
  }
  if (data.customer.address) {
    const lines = doc.splitTextToSize(data.customer.address, pageW / 2) as string[]
    doc.text(lines, margin, y)
    y += lines.length * 5
  }
  y += 4

  // --- Line items ---
  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Layanan", "Harga"]],
    body: data.items.length
      ? data.items.map((it, i) => [String(i + 1), it.name || "-", it.services || "-", rupiah(it.price)])
      : [["-", "Tidak ada rincian item", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: "left" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
    },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: margin, right: margin },
  })

  let afterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // --- Totals (right) ---
  const labelX = pageW - margin - 60
  const valX = pageW - margin
  const totals: Array<[string, string, boolean]> = [
    ["Total", rupiah(data.totalPrice), false],
    ["Terbayar", rupiah(data.totalPaid), false],
    ["Sisa", rupiah(data.credit), true],
  ]
  doc.setFontSize(10)
  totals.forEach(([label, value, bold]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.text(label, labelX, afterY)
    doc.text(value, valX, afterY, { align: "right" })
    afterY += 6
  })

  // --- Payment history ---
  if (data.payments && data.payments.length) {
    afterY += 4
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Riwayat Pembayaran", margin, afterY)
    afterY += 2
    autoTable(doc, {
      startY: afterY,
      head: [["Tanggal", "Nominal", "Catatan"]],
      body: data.payments.map((p) => [tanggal(p.date), rupiah(p.nominal), p.note || "-"]),
      theme: "grid",
      headStyles: { fillColor: [120, 120, 120], textColor: 255 },
      columnStyles: { 1: { halign: "right", cellWidth: 35 } },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: margin, right: margin },
    })
  }

  // --- Footer ---
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, margin, pageH - 12)
  doc.text("Terima kasih atas kepercayaan Anda.", pageW - margin, pageH - 12, { align: "right" })
  doc.setTextColor(0)

  return doc
}

/** Generate and download the invoice PDF. */
export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data)
  doc.save(`Invoice-${data.code}.pdf`)
}
