"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { AppSidebar, navGroups } from "@/components/app-sidebar"
import { BranchSwitcher } from "@/components/branch-switcher"
import { FullscreenLoader } from "@/components/fullscreen-loader"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Toaster } from "sonner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // Judul breadcrumb diambil dari navGroups — segmen pertama path saja,
  // sub-route (/pesanan/create, /pesanan/[id]/edit) tetap memakai judul induknya.
  const title = useMemo(() => {
    const base = "/" + (pathname?.split("/").filter(Boolean)[0] ?? "")
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.url === base) return item.title
        const child = item.children?.find((c) => c.url === base)
        if (child) return child.title
      }
    }
    return "Dashboard"
  }, [pathname])

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  // Cek auth session
  if (loading) return <FullscreenLoader message="Memeriksa sesi..." />

  // Belum login — redirect sedang berjalan
  if (!user) return <FullscreenLoader message="Mengalihkan ke halaman login..." />

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header
          className="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4"
          style={{ paddingTop: "var(--safe-top)", height: "calc(3.5rem + var(--safe-top))" }}
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4 sm:mr-2" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto min-w-0 shrink">
            <BranchSwitcher />
          </div>
        </header>
        {/* SidebarInset sudah <main>, jadi ini <div> — hindari landmark main ganda */}
        <div className="flex-1 p-4 pb-[calc(1rem+var(--safe-bottom))] sm:p-6 sm:pb-[calc(1.5rem+var(--safe-bottom))]">
          {children}
        </div>
      </SidebarInset>
      {/* Di HP toast muncul di bawah agar tidak menutupi header sticky */}
      <Toaster position={isMobile ? "bottom-center" : "top-right"} richColors />
    </SidebarProvider>
  )
}
