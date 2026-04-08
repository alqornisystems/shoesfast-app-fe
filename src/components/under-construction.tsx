import { Construction, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type UnderConstructionProps = {
  title: string
  description?: string
}

export function UnderConstruction({
  title,
  description = "Halaman ini sedang dalam tahap pengembangan dan akan segera tersedia.",
}: UnderConstructionProps) {
  return (
    <div className="flex min-h-[600px] items-center justify-center">
      <div className="mx-auto max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
          <Construction className="h-10 w-10 text-yellow-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-xs text-muted-foreground">
          <p>Fitur ini akan segera hadir. Terima kasih atas kesabarannya.</p>
        </div>
      </div>
    </div>
  )
}
