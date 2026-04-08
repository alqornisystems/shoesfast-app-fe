"use client"

import {
  AlertCircle,
  BadgePercent,
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileText,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquareDot,
  PackageCheck,
  ScrollText,
  Send,
  Settings,
  Shirt,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wrench,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type NavChild = {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  roles?: string[] // Optional: specific roles that can access this
}

type NavItem = {
  title: string
  url?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavChild[]
  roles?: string[] // Optional: specific roles that can access this
}

type NavGroup = {
  label: string
  items: NavItem[]
  roles?: string[] // Optional: specific roles that can access this group
}

const navGroups: NavGroup[] = [
  // DASHBOARD - Accessible to all roles
  {
    label: "Dashboard",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  // OPERASIONAL - Admin Super, Admin, Supervisor, Teknisi
  {
    label: "Operasional",
    roles: ['Admin Super', 'Admin', 'Supervisor / Lead', 'Teknisi'],
    items: [
      {
        title: "Pesanan",
        url: "/pesanan",
        icon: ShoppingBag,
        roles: ['Admin Super', 'Admin', 'Supervisor / Lead'],
      },
      {
        title: "Layanan",
        url: "/layanan",
        icon: Shirt,
        roles: ['Admin Super', 'Admin'],
      },
      {
        title: "Pengerjaan",
        icon: Wrench,
        children: [
          {
            title: "Waiting List",
            url: "/pengerjaan-waiting",
            icon: ClipboardList,
            roles: ['Admin Super', 'Admin', 'Supervisor / Lead']
          },
          {
            title: "Dalam Proses",
            url: "/pengerjaan",
            icon: Wrench,
            roles: ['Admin Super', 'Admin', 'Supervisor / Lead', 'Teknisi']
          },
          {
            title: "Pengerjaan Mitra",
            url: "/pengerjaan-mitra",
            icon: UserCheck,
            roles: ['Admin Super', 'Admin', 'Supervisor / Lead']
          },
          {
            title: "Histori",
            url: "/pengerjaan-histori",
            icon: History,
            roles: ['Admin Super', 'Admin', 'Supervisor / Lead', 'Teknisi']
          },
        ],
      },
      {
        title: "Mitra Kerja",
        url: "/mitra-kerja",
        icon: UserCheck,
        roles: ['Admin Super', 'Admin'],
      },
      {
        title: "Pengiriman",
        icon: Truck,
        roles: ['Admin Super', 'Admin', 'Supervisor / Lead', 'Kurir'],
        children: [
          {
            title: "Pickup Waiting",
            url: "/pengiriman/pickup-waiting",
            icon: ClipboardList,
          },
          {
            title: "Delivery Waiting",
            url: "/pengiriman/delivery-waiting",
            icon: PackageCheck,
          },
          {
            title: "Dalam Proses",
            url: "/pengiriman/dalam-proses",
            icon: Truck,
          },
          {
            title: "Histori",
            url: "/pengiriman/histori",
            icon: History,
          },
        ],
      },
    ],
  },

  // PELANGGAN & CRM - Admin Super, Admin, Admin CRM, Admin Sosmed
  {
    label: "Pelanggan & CRM",
    roles: ['Admin Super', 'Admin', 'Admin Crm', 'Admin Sosmed', 'Supervisor / Lead'],
    items: [
      {
        title: "Data Pelanggan",
        url: "/pelanggan",
        icon: Users,
      },
      {
        title: "Member",
        url: "/member",
        icon: Star,
      },
      {
        title: "Broadcast WhatsApp",
        icon: MessageSquareDot,
        roles: ['Admin Super', 'Admin', 'Admin Crm', 'Admin Sosmed'],
        children: [
          { title: "Template Pesan", url: "/broadcasts-templates", icon: FileText },
          { title: "Kirim Broadcast", url: "/broadcasts-sends", icon: Send },
        ],
      },
    ],
  },

  // KEUANGAN - Admin Super, Admin, Finance
  {
    label: "Keuangan",
    roles: ['Admin Super', 'Admin', 'Finance', 'Supervisor / Lead'],
    items: [
      {
        title: "Pembayaran",
        url: "/pembayaran",
        icon: HandCoins,
      },
      {
        title: "Pengeluaran",
        icon: CircleDollarSign,
        children: [
          { title: "Pengeluaran Umum", url: "/pengeluaran", icon: CircleDollarSign },
          { title: "Pengeluaran Operasional", url: "/pengeluaran-oprasional", icon: FileText },
        ],
      },
    ],
  },

  // SDM - Admin Super, Admin, HRD
  {
    label: "Sumber Daya Manusia",
    roles: ['Admin Super', 'Admin', 'HRD', 'Supervisor / Lead'],
    items: [
      {
        title: "Data Karyawan",
        url: "/karyawan",
        icon: Users,
      },
      {
        title: "Jabatan",
        url: "/jabatan",
        icon: ClipboardCheck,
      },
      {
        title: "Absensi",
        url: "/absensi",
        icon: ClipboardCheck,
      },
      {
        title: "Pengajuan Izin",
        url: "/izin",
        icon: FileText,
      },
      {
        title: "Catatan Harian",
        url: "/catatan-harian",
        icon: ScrollText,
      },
    ],
  },

  // LAPORAN - Admin Super, Admin, Finance, HRD, Supervisor, Admin Sosmed, Admin CRM
  {
    label: "Laporan",
    roles: ['Admin Super', 'Admin', 'Finance', 'HRD', 'Supervisor / Lead', 'Admin Sosmed', 'Admin Crm'],
    items: [
      {
        title: "Laporan Pengerjaan",
        url: "/laporan-pengerjaan",
        icon: Wrench,
        roles: ['Admin Super', 'Admin', 'Supervisor / Lead'],
      },
      {
        title: "Laporan Pelanggan",
        url: "/laporan-pelanggan",
        icon: Users,
        roles: ['Admin Super', 'Admin', 'Admin Crm', 'Admin Sosmed', 'Supervisor / Lead'],
      },
      {
        title: "Laporan Iklan",
        icon: Megaphone,
        roles: ['Admin Super', 'Admin', 'Admin Sosmed', 'Admin Crm', 'Supervisor / Lead'],
        children: [
          { title: "Google Ads", url: "/laporan-google-ads", icon: BarChart2 },
          { title: "Meta Ads", url: "/laporan-meta-ads", icon: BarChart2 },
        ],
      },
      {
        title: "Laporan Keuangan",
        icon: CircleDollarSign,
        roles: ['Admin Super', 'Admin', 'Finance', 'Supervisor / Lead'],
        children: [
          { title: "Laporan Penjualan", url: "/laporan-penjualan", icon: TrendingUp },
          { title: "Laporan Pembayaran", url: "/laporan-pembayaran", icon: HandCoins },
          { title: "Laporan Piutang", url: "/laporan-piutang", icon: AlertCircle },
          { title: "Laporan Pesanan", url: "/laporan-pesanan", icon: ShoppingBag },
          { title: "Laporan Pengeluaran", url: "/laporan-pengeluaran", icon: CircleDollarSign },
          { title: "Laporan HPP", url: "/laporan-hpp", icon: BarChart2 },
          { title: "Laporan Laba Rugi", url: "/laporan-laba-rugi", icon: TrendingUp },
          { title: "Laporan Arus Kas", url: "/laporan-arus-kas", icon: HandCoins },
          { title: "Neraca", url: "/laporan-neraca", icon: BookOpen },
        ],
      },
      {
        title: "Laporan SDM",
        icon: ClipboardCheck,
        roles: ['Admin Super', 'Admin', 'HRD', 'Supervisor / Lead'],
        children: [
          { title: "Laporan Absensi", url: "/laporan-absensi", icon: ClipboardCheck },
          { title: "Laporan Catatan Harian", url: "/laporan-catatan-harian", icon: ScrollText },
        ],
      },
    ],
  },

  // PENGATURAN PERUSAHAAN - Admin Super, Admin only
  {
    label: "Pengaturan Perusahaan",
    roles: ['Admin Super', 'Admin'],
    items: [
      {
        title: "Kalender Libur",
        url: "/kalender-libur",
        icon: Calendar,
      },
      {
        title: "Cabang",
        url: "/cabang",
        icon: Building2,
      },
      {
        title: "Pengaturan",
        url: "/profile",
        icon: Settings,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  // Helper function to check if user has access to a menu item
  const hasAccess = (roles?: string[]): boolean => {
    // If no roles specified, accessible to all
    if (!roles || roles.length === 0) return true

    // Super admin has access to everything
    if (user?.is_super_admin) return true

    // Check if user's role is in the allowed roles
    const userRole = user?.role?.toLowerCase() || ''
    return roles.some(role => role.toLowerCase() === userRole)
  }

  // Filter nav groups based on user role
  const visibleNavGroups = navGroups.filter(group => hasAccess(group.roles))

  return (
    <>
    <Sidebar variant="inset">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-1 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
                <Shirt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base tracking-tight">Shoesfast</span>
                <span className="text-[11px] text-muted-foreground">Management System</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="gap-0">
        {visibleNavGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {groupIdx > 0 && <SidebarSeparator className="my-1" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {group.items
                  .filter(item => hasAccess(item.roles)) // Filter items by role
                  .map((item) => {
                  if (!item.children) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          tooltip={item.title}
                          className="h-9"
                        >
                          <Link href={item.url!}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  // Filter children by role
                  const visibleChildren = item.children.filter(child => hasAccess(child.roles))

                  // Don't show parent if no children are visible
                  if (visibleChildren.length === 0) return null

                  const isAnyChildActive = visibleChildren.some((c) =>
                    pathname.startsWith(c.url)
                  )

                  return (
                    <Collapsible
                      key={item.title}
                      defaultOpen={isAnyChildActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title} className="h-9">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {visibleChildren.map((child) => (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === child.url}
                                  className="h-8"
                                >
                                  <Link href={child.url}>
                                    {child.icon && (
                                      <child.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="h-12 cursor-pointer"
              onClick={() => setLogoutOpen(true)}
              tooltip="Keluar"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left text-sm leading-tight">
                <span className="font-semibold truncate">{user?.name ?? "Admin"}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</span>
              </div>
              <LogOut className="ml-auto h-4 w-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    {/* Logout Confirmation */}
    <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan keluar dari sesi ini. Pastikan semua pekerjaan sudah tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => logout()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Ya, Keluar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
