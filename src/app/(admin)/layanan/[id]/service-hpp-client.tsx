"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Loader2, Save } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

type HppItem = {
  id?: number
  name: string
  unit: string
  total_stock: number
  usage_per_service: number
  total_cost: number
  cost_per_usage: number
}

type HppData = {
  direct_material: HppItem[]
  direct_labor: HppItem[]
  indirect_material: HppItem[]
}

type Service = {
  id: number
  name: string
  price: number
  estimation: number
}

const emptyHppItem: HppItem = {
  name: "",
  unit: "",
  total_stock: 0,
  usage_per_service: 0,
  total_cost: 0,
  cost_per_usage: 0,
}

const SATUAN_BARANG = [
  "unit", "pcs", "lusin", "kodi", "gross", "rim",
  "kg", "gram", "ton", "liter", "ml", "meter", "cm",
  "mm", "inci", "yard", "roll", "botol", "sachet", "kaleng",
  "karung", "box", "dus", "set", "pack", "tablet", "strip"
]

export function ServiceHppClient() {
  const params = useParams()
  const router = useRouter()
  const serviceId = Number(params.id)

  const [service, setService] = useState<Service | null>(null)
  const [hpp, setHpp] = useState<HppData>({
    direct_material: [],
    direct_labor: [],
    indirect_material: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [serviceId])

  async function fetchData() {
    setLoading(true)
    try {
      const [serviceRes, hppRes] = await Promise.all([
        api.get<any>(`/api/services/${serviceId}`),
        api.get<any>(`/api/services/${serviceId}/hpp`),
      ])

      setService(serviceRes.data)
      setHpp(hppRes.data)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  function addHppItem(category: keyof HppData) {
    setHpp({
      ...hpp,
      [category]: [...hpp[category], { ...emptyHppItem }],
    })
  }

  function deleteHppItem(category: keyof HppData, index: number) {
    const newItems = [...hpp[category]]
    newItems.splice(index, 1)
    setHpp({
      ...hpp,
      [category]: newItems,
    })
  }

  function updateHppItem(category: keyof HppData, index: number, field: keyof HppItem, value: any) {
    const newItems = [...hpp[category]]
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    }

    // Auto-calculate cost_per_usage when relevant fields change
    if (field === 'total_cost' || field === 'total_stock' || field === 'usage_per_service') {
      const item = newItems[index]
      if (item.total_cost && item.total_stock && item.usage_per_service) {
        item.cost_per_usage = Math.round((item.total_cost / item.total_stock) * item.usage_per_service)
      }
    }

    setHpp({
      ...hpp,
      [category]: newItems,
    })
  }

  function calculateTotal(category: keyof HppData): number {
    return hpp[category].reduce((sum, item) => sum + (item.cost_per_usage || 0), 0)
  }

  function calculateTotalHpp(): number {
    return calculateTotal('direct_material') +
           calculateTotal('direct_labor') +
           calculateTotal('indirect_material')
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.post(`/api/services/${serviceId}/hpp/batch`, hpp)
      router.push('/layanan')
    } catch (error) {

    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Layanan tidak ditemukan.</p>
        <Button onClick={() => router.push('/layanan')} className="mt-4">
          Kembali
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/layanan')}
          className="mb-4 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola HPP (Harga Pokok Penjualan) untuk layanan ini
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Simpan HPP
          </Button>
        </div>
      </div>

      {/* Service Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Harga Jual</div>
              <div className="text-lg font-semibold">{formatCurrency(service.price)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total HPP</div>
              <div className="text-lg font-semibold text-orange-600">{formatCurrency(calculateTotalHpp())}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Estimasi</div>
              <div className="text-lg font-semibold">{service.estimation} hari</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Material */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bahan Baku Langsung (Direct Material)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Bahan yang langsung digunakan untuk layanan
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addHppItem('direct_material')}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent>
          <HppTable
            items={hpp.direct_material}
            category="direct_material"
            onUpdate={updateHppItem}
            onDelete={deleteHppItem}
          />
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Bahan Baku Langsung</div>
              <div className="text-lg font-bold">{formatCurrency(calculateTotal('direct_material'))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Labor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tenaga Kerja Langsung (Direct Labor)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Biaya tenaga kerja langsung untuk layanan
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addHppItem('direct_labor')}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent>
          <HppTable
            items={hpp.direct_labor}
            category="direct_labor"
            onUpdate={updateHppItem}
            onDelete={deleteHppItem}
            isLabor={true}
          />
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Tenaga Kerja Langsung</div>
              <div className="text-lg font-bold">{formatCurrency(calculateTotal('direct_labor'))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indirect Material */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bahan Baku Tidak Langsung (Indirect Material)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Bahan pendukung yang tidak langsung digunakan
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addHppItem('indirect_material')}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent>
          <HppTable
            items={hpp.indirect_material}
            category="indirect_material"
            onUpdate={updateHppItem}
            onDelete={deleteHppItem}
          />
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Bahan Baku Tidak Langsung</div>
              <div className="text-lg font-bold">{formatCurrency(calculateTotal('indirect_material'))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total HPP Summary */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Total HPP Per Treatment</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(calculateTotalHpp())}</div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/layanan')}>
          Batal
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Save className="h-4 w-4" />
          Simpan HPP
        </Button>
      </div>
    </div>
  )
}

type HppTableProps = {
  items: HppItem[]
  category: keyof HppData
  onUpdate: (category: keyof HppData, index: number, field: keyof HppItem, value: any) => void
  onDelete: (category: keyof HppData, index: number) => void
  isLabor?: boolean
}

function HppTable({ items, category, onUpdate, onDelete, isLabor = false }: HppTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Belum ada item. Klik tombol "Tambah" untuk menambahkan.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">{isLabor ? "Nama Pengerjaan" : "Nama Bahan"}</TableHead>
            <TableHead className="w-[150px]">Satuan</TableHead>
            <TableHead className="w-[150px] text-right">Konversi</TableHead>
            <TableHead className="w-[150px] text-right">Kebutuhan</TableHead>
            <TableHead className="w-[150px] text-right">Harga Beli</TableHead>
            <TableHead className="w-[150px] text-right">Biaya Produk</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  placeholder={isLabor ? "Nama pengerjaan" : "Nama bahan"}
                  value={item.name}
                  onChange={(e) => onUpdate(category, index, 'name', e.target.value)}
                  className="h-9"
                />
              </TableCell>
              <TableCell>
                {isLabor ? (
                  <Input
                    placeholder="Satuan"
                    value={item.unit}
                    onChange={(e) => onUpdate(category, index, 'unit', e.target.value)}
                    className="h-9"
                  />
                ) : (
                  <Select
                    value={item.unit}
                    onValueChange={(value) => onUpdate(category, index, 'unit', value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih satuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_BARANG.map((satuan) => (
                        <SelectItem key={satuan} value={satuan}>
                          {satuan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.total_stock || ""}
                    onChange={(e) => onUpdate(category, index, 'total_stock', Number(e.target.value))}
                    className="h-9 text-right"
                  />
                  {item.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.usage_per_service || ""}
                    onChange={(e) => onUpdate(category, index, 'usage_per_service', Number(e.target.value))}
                    className="h-9 text-right"
                  />
                  {item.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Rp</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.total_cost || ""}
                    onChange={(e) => onUpdate(category, index, 'total_cost', Number(e.target.value))}
                    className="h-9 text-right"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Rp</span>
                  <Input
                    type="number"
                    value={item.cost_per_usage || ""}
                    readOnly
                    className="h-9 text-right bg-muted"
                  />
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(category, index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
