# Branch Scoping, Tabs & Map Picker

Three smaller cross-cutting idioms a new page often needs.

---

## 1. Multi-branch scoping (frontend)

The backend scopes almost every table to the active branch (`projects_id`). The frontend mirrors it
via `useAuth().branch = { active_id, active_name, can_switch }`.

**Rules**

- **You usually do nothing.** Data is scoped server-side by the token's active branch, so a normal
  list/report page already returns only the active branch's rows. Just fetch as usual.
- **Switching branches does a full reload.** `<BranchSwitcher>` calls `switchBranch(id)` (persists
  server-side) then `window.location.reload()` — so every page re-fetches automatically. **Don't**
  add a `useEffect(..., [branch])` refetch; the reload already handles it.
- **When creating a record, default `projects_id` from the active branch** if the form needs it.
  A branch user is locked (`active_id` is their branch); a super admin viewing "all" has
  `active_id === null` and must pick a branch. Pattern from `karyawan/user-client.tsx`:

  ```tsx
  const { branch } = useAuth()
  // seed the form
  if (branch && branch.active_id !== null) initialForm.projects_id = String(branch.active_id)
  // lock the field for branch users, show a picker only when active_id === null
  <Select disabled={branch?.active_id !== null} /* … */ />
  ```

- **Never send a client-chosen `projects_id` to override scoping** for tenant data — the backend
  ignores/validates it. Only the super-admin "which branch to create in" case sets it deliberately.

---

## 2. Tabs (segmented list views)

For a page that shows the same table filtered by a mode (pickup/delivery, waiting/proses/histori),
use shadcn `Tabs` with a typed `activeTab` state that drives both the fetch and the copy.

**Canonical:** `src/app/(admin)/pengiriman/send-client.tsx`

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const [activeTab, setActiveTab] = useState<"pickup" | "delivery">("pickup")

// refetch when the tab changes
useEffect(() => { fetchData() }, [activeTab])

async function fetchData() {
  const params = new URLSearchParams({ type: activeTab === "pickup" ? "0" : "1", /* …page… */ })
  // …api.get with params…
}

return (
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pickup" | "delivery")} className="space-y-4">
    <TabsList className="grid w-full max-w-md grid-cols-2">
      <TabsTrigger value="pickup" className="gap-2">Penjemputan</TabsTrigger>
      <TabsTrigger value="delivery" className="gap-2">Pengantaran</TabsTrigger>
    </TabsList>
    <TabsContent value={activeTab} className="space-y-4">
      {/* the list-page table (see list-page.md), copy keyed off activeTab */}
    </TabsContent>
  </Tabs>
)
```

Rules: type the tab union, refetch in a `useEffect([activeTab])`, reset to page 1 on tab change,
and derive labels from `activeTab` instead of duplicating tables.

---

## 3. Map picker (Leaflet)

For capturing a location as a Google Maps URL, use the shared `<MapPicker>` — don't wire Leaflet by
hand. Used in `pelanggan` and `cabang`.

**Component:** `src/components/map-picker.tsx`

```tsx
import { MapPicker } from "@/components/map-picker"

<MapPicker
  value={form.maps}                                   // Google Maps URL string, or ""
  onChange={(mapsUrl) => setForm({ ...form, maps: mapsUrl })}
/>
```

- `value` is a Google Maps URL string (stored on the form field); the picker parses `@lat,lng` out
  of it to place the marker, and calls `onChange(mapsUrl, lat?, lng?)` when the user clicks the map
  or pastes a URL.
- Store just the `mapsUrl` on the form and post it like any other string field.
- Leaflet must render client-side only — `MapPicker` already handles that; keep it inside a
  `"use client"` component (all form clients are).
