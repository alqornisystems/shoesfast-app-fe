"use client"

export default function InvoiceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invoice tidak dapat dimuat</h1>
        <p className="text-sm text-muted-foreground">
          Terjadi kesalahan saat menampilkan invoice ini. Silakan coba lagi beberapa saat lagi.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-block font-medium text-green-600 underline"
        >
          Coba lagi
        </button>
      </div>
    </div>
  )
}
