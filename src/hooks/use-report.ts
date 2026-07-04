"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { toast } from "sonner"
import { api } from "@/lib/api"

/**
 * Shared data layer for report pages (`laporan-*`).
 *
 * Handles the boilerplate every report repeats: a start/end date range
 * defaulting to the current month, converting it to the query params the
 * backend expects, fetching through the `api` client (so it gets the auth
 * token, base-URL fallback and 401 handling — unlike raw `fetch`), and
 * loading/error state.
 *
 * Pair it with <ReportShell> for the surrounding UI.
 */
export interface UseReportOptions<T> {
  /** Backend endpoint, e.g. "/api/reports/sales". */
  endpoint: string
  /**
   * How the date range is sent:
   * - "timestamp" (default): unix seconds as `start_date` / `end_date`
   * - "date": raw "yyyy-MM-dd" strings
   */
  dateParam?: "timestamp" | "date"
  /** Extra query params merged into every request. */
  params?: Record<string, string | number | undefined>
  /** Fetch on mount and whenever the range changes (default true). */
  autoFetch?: boolean
  /** Optional reshape of the raw response before it lands in `data`. */
  transform?: (raw: unknown) => T
}

export interface UseReportResult<T> {
  data: T | null
  loading: boolean
  startDate: string
  endDate: string
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
  /** Re-run the fetch with the current range. */
  refetch: () => Promise<void>
}

export function useReport<T = unknown>(options: UseReportOptions<T>): UseReportResult<T> {
  const { endpoint, dateParam = "timestamp", autoFetch = true } = options

  const now = new Date()
  const [startDate, setStartDate] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)

  // Keep the latest transform/params in refs so they don't destabilize refetch
  // (an inline transform would otherwise re-trigger the fetch effect every render).
  const transformRef = useRef(options.transform)
  transformRef.current = options.transform
  const paramsRef = useRef(options.params)
  paramsRef.current = options.params

  const refetch = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (dateParam === "timestamp") {
        query.set("start_date", String(Math.floor(new Date(startDate).getTime() / 1000)))
        query.set("end_date", String(Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)))
      } else {
        query.set("start_date", startDate)
        query.set("end_date", endDate)
      }
      for (const [key, value] of Object.entries(paramsRef.current ?? {})) {
        if (value !== undefined && value !== "") query.set(key, String(value))
      }

      const raw = await api.get<unknown>(`${endpoint}?${query.toString()}`)
      const transform = transformRef.current
      setData(transform ? transform(raw) : (raw as T))
    } catch (err) {
      const e = err as { message?: string }
      toast.error(e?.message || "Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }, [endpoint, dateParam, startDate, endDate])

  useEffect(() => {
    if (autoFetch) refetch()
  }, [autoFetch, refetch])

  return { data, loading, startDate, endDate, setStartDate, setEndDate, refetch }
}
