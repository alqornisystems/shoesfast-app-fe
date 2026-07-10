# Status Badge / Label-Map Pattern

Backend statuses are **integers**. Render them through a single `Record<number, …>` label map per
feature so the label, color, and variant stay consistent — never scatter `if (status === 1)` checks
through the JSX.

**Canonical:** the `STATUS_LABELS` map in `src/app/(admin)/pesanan/order-client.tsx`.

---

## The 3 rules

1. **One `STATUS_LABELS` const per feature**, keyed by the integer status, holding everything the UI
   needs: `label`, a shadcn `variant`, and a Tailwind `color` class set. Keep it at module scope
   (above the component), next to the type.

2. **Always read through the map with a fallback** — `STATUS_LABELS[status]?.label || "Unknown"`.
   A new/unknown status from the backend must degrade gracefully, not render blank or crash.

3. **Pick one render style and reuse it:** the shadcn `<Badge variant={…}>` for the simple case, or
   an inline pill using the `color` classes when you need the tinted background. Use the same style
   across the feature's list, detail, and report views.

---

## The map + render

```tsx
const STATUS_LABELS: Record<number, {
  label: string
  variant: "default" | "secondary" | "outline" | "destructive"
  color: string
}> = {
  0: { label: "Pending",     variant: "secondary",   color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  1: { label: "Proses",      variant: "default",     color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  2: { label: "Selesai",     variant: "outline",     color: "bg-green-500/10 text-green-700 border-green-200" },
  3: { label: "Dibatalkan",  variant: "destructive", color: "bg-red-500/10 text-red-700 border-red-200" },
}
```

```tsx
// pill style (tinted background)
<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
  STATUS_LABELS[order.status]?.color || "bg-gray-100 text-gray-700 border-gray-200"
}`}>
  {STATUS_LABELS[order.status]?.label || "Unknown"}
</span>

// badge style
<Badge variant={STATUS_LABELS[order.status]?.variant || "secondary"}>
  {STATUS_LABELS[order.status]?.label || "Unknown"}
</Badge>
```

> Same idea for any coded enum (payment state, delivery type, member tier) — a keyed map + a
> fallback, defined once per feature.
