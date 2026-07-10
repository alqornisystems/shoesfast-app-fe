# Navigation & Route Pattern

**How a new page becomes reachable.** A page under `src/app/(admin)/` is authenticated but
**invisible until registered in the sidebar** — this is the step people forget. Do all three:
create the route folder, split `page.tsx` → `*-client.tsx`, and add a `navGroups` entry.

**Source:** `src/components/app-sidebar.tsx` · routes under `src/app/(admin)/`

---

## The 5 rules

1. **Route folder = Indonesian domain term**, kebab-case, one folder per feature under
   `src/app/(admin)/`. Match the existing vocabulary: `pesanan` (orders), `pelanggan` (customers),
   `pengerjaan` (treatments), `pengiriman` (delivery), `pembayaran` (payments), `laporan-*`
   (reports). Sub-routes nest (`pengiriman/pickup-waiting`, `pesanan/[id]/edit`).

2. **`page.tsx` is a one-line server component** that renders the co-located `"use client"`
   `*-client.tsx` (or, for reports, `page.tsx` is the client page itself). See
   [list-page.md](./list-page.md) / [form.md](./form.md).

3. **Register in `navGroups`** (`app-sidebar.tsx`). Add a `NavItem` to the right group, or a new
   `NavGroup` if it's a new section. A flat item has `{ title, url, icon }`; a submenu has
   `{ title, icon, children: [{ title, url, icon }] }` (parent has **no** `url`). Icons are
   `lucide-react` components — import at the top of the file.

4. **Role-gate with `roles`.** `roles?: string[]` can sit on a group, an item, or a child; omit it
   to allow everyone. Known roles: `Admin Super`, `Admin`, `Supervisor / Lead`, `Teknisi`, `Kurir`,
   `Finance`, `HRD`, `Admin Crm`, `Admin Sosmed`. A group's `roles` gates the whole section; put
   finer limits on individual items. Match strings exactly (note `Admin Crm`, `HRD` casing).

5. **The `(admin)/layout.tsx` handles auth + chrome for you** — it blocks on `useAuth().loading`,
   redirects to `/login` when unauthenticated, and renders the sidebar, branch switcher, and
   breadcrumb. A new page needs none of that; just build the body.

---

## Adding a page — checklist

```
1. mkdir  src/app/(admin)/<fitur>/
2. page.tsx        →  export default function Page() { return <FiturClient /> }
3. <fitur>-client.tsx  →  "use client" + the archetype pattern (list / form / report)
4. app-sidebar.tsx →  import the icon + add the navGroups entry (with roles)
```

## navGroups shapes

```tsx
// flat item
{ title: "Layanan", url: "/layanan", icon: Shirt, roles: ['Admin Super', 'Admin'] }

// submenu (parent has icon but no url)
{
  title: "Pengerjaan",
  icon: Wrench,
  children: [
    { title: "Waiting List", url: "/pengerjaan-waiting", icon: ClipboardList,
      roles: ['Admin Super', 'Admin', 'Supervisor / Lead'] },
    { title: "Dalam Proses", url: "/pengerjaan", icon: Wrench,
      roles: ['Admin Super', 'Admin', 'Supervisor / Lead', 'Teknisi'] },
  ],
}

// a whole new section
{
  label: "Keuangan",
  roles: ['Admin Super', 'Admin', 'Finance'],
  items: [ /* NavItems */ ],
}
```

> The `url` must match the route folder (`/layanan` ↔ `src/app/(admin)/layanan/`). A mismatch gives
> a sidebar link that 404s.
