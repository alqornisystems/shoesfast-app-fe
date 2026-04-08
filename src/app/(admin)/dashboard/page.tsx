import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag,
  Users,
  Wrench,
  HandCoins,
} from "lucide-react"

const stats = [
  {
    title: "Total Pesanan",
    value: "0",
    description: "Bulan ini",
    icon: ShoppingBag,
    badge: "Pesanan",
  },
  {
    title: "Pelanggan",
    value: "0",
    description: "Total terdaftar",
    icon: Users,
    badge: "Pelanggan",
  },
  {
    title: "Dalam Pengerjaan",
    value: "0",
    description: "Sedang diproses",
    icon: Wrench,
    badge: "Treatment",
  },
  {
    title: "Pendapatan",
    value: "Rp 0",
    description: "Bulan ini",
    icon: HandCoins,
    badge: "Keuangan",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di Shoesfast Admin Panel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <Badge variant="secondary" className="text-xs">{stat.badge}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
