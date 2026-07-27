export default function InvoiceLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Memuat invoice…</h1>
        <p className="text-sm text-muted-foreground">Mohon tunggu sebentar.</p>
      </div>
    </div>
  )
}
