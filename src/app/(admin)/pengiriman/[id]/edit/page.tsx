"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, Loader2, Calendar, User, Truck, Package } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

type Send = {
  id: number
  orders_id: number
  orders_items_id: number | null
  users_id: number
  date: number
  status: number
  type: number
  order: {
    id: number
    code: string
    customer_name: string
    customer_address: string
  }
  order_item: {
    id: number
    name: string
  } | null
  user: {
    id: number
    name: string
  }
}

type User = {
  id: number
  name: string
  phone: string | null
}

export default function EditPengirimanPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [send, setSend] = useState<Send | null>(null)
  const [couriers, setCouriers] = useState<User[]>([])

  const [formData, setFormData] = useState({
    users_id: "",
    date: "",
    status: "0",
  })

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      const [sendRes, couriersRes] = await Promise.all([
        api.get<Send>(`/api/sends/${id}`),
        api.get<User[]>('/api/sends/available-couriers'),
      ])

      setSend(sendRes)
      setCouriers(couriersRes)

      // Set form data
      setFormData({
        users_id: String(sendRes.users_id),
        date: new Date(sendRes.date * 1000).toISOString().split('T')[0],
        status: String(sendRes.status),
      })
    } catch (error) {
      toast.error("Gagal memuat data pengiriman")
      router.push('/pengiriman')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.users_id || !formData.date) {
      toast.error("Mohon lengkapi semua field")
      return
    }

    setSaving(true)
    try {
      await api.put(`/api/sends/${id}`, {
        users_id: parseInt(formData.users_id),
        date: formData.date,
        status: parseInt(formData.status),
      })

      toast.success("Pengiriman berhasil diupdate")
      router.push('/pengiriman')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal mengupdate pengiriman")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!send) return null

  const typeLabel = send.type === 0 ? "Penjemputan" : "Pengantaran"
  const typeIcon = send.type === 0 ? <Package className="h-4 w-4" /> : <Truck className="h-4 w-4" />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/pengiriman')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit {typeLabel}</h1>
          <p className="text-sm text-muted-foreground">
            Update informasi {typeLabel.toLowerCase()} pesanan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Info - Read Only */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {typeIcon}
              <CardTitle>Informasi Pesanan</CardTitle>
            </div>
            <CardDescription>Data pesanan yang akan dikirim (tidak dapat diubah)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Kode Pesanan</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 py-1 text-sm">
                  <Badge variant="outline" className="font-mono">
                    {send.order.code}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipe Pengiriman</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 py-1 text-sm">
                  <Badge variant={send.type === 0 ? "default" : "secondary"}>
                    {typeLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
                <div className="font-medium">{send.order.customer_name}</div>
                <div className="text-xs text-muted-foreground">{send.order.customer_address}</div>
              </div>
            </div>

            {send.order_item && (
              <div className="space-y-2">
                <Label>Item</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 py-1 text-sm">
                  {send.order_item.name}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editable Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Detail {typeLabel}</CardTitle>
            <CardDescription>Update kurir, tanggal, dan status pengiriman</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="users_id">
                Kurir <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.users_id}
                onValueChange={(value) => setFormData({ ...formData, users_id: value })}
              >
                <SelectTrigger id="users_id">
                  <SelectValue placeholder="Pilih kurir" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier) => (
                    <SelectItem key={courier.id} value={String(courier.id)}>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{courier.name}</span>
                        {courier.phone && (
                          <span className="text-xs text-muted-foreground">({courier.phone})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                Tanggal <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <Badge variant="secondary">Pending</Badge>
                  </SelectItem>
                  <SelectItem value="1">
                    <Badge variant="outline">Selesai</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/pengiriman')}
            disabled={saving}
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
