export default function InvoiceNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invoice tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Link invoice ini tidak dikenal. Pastikan link disalin secara utuh, atau hubungi
          Shoesfast untuk meminta link baru.
        </p>
      </div>
    </div>
  )
}
