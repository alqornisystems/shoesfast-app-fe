# Form Pattern (create / edit)

The app uses **plain `useState` forms** — there is no `react-hook-form`. A form comes in two
shapes; pick by entity complexity:

- **Dialog form** — for master data with a handful of fields (create/edit right on the list page).
  **Canonical:** `src/app/(admin)/pelanggan/customer-client.tsx`.
- **Full-page form** — for complex entities with nested items / sub-dialogs, on its own route.
  **Canonical:** `src/app/(admin)/pesanan/create/order-form-client.tsx`.

Both share the same state + submit contract below; only the container (Dialog vs page) differs.

---

## The 7 rules

1. **One `form` state object + one `errors` map.** `const [form, setForm] = useState<FormState>(emptyForm)`
   and `const [errors, setErrors] = useState<ErrorState>({})`. Update fields with
   `setForm({ ...form, name: e.target.value })` and clear that field's error on change
   (`setErrors({ ...errors, name: undefined })`).

2. **`openAdd()` / `openEdit(row)` seed the form.** `openAdd` sets `editTarget = null`, resets to
   `emptyForm`, clears errors. `openEdit` sets `editTarget = row` and maps each field with a
   `?? ""` / `String(...)` fallback so no input goes uncontrolled. A single `editTarget` (null vs
   row) is what tells the dialog "create" from "edit".

3. **Client-validate first, then submit.** In `handleSave`, build an `errs` object for required
   fields; if `Object.keys(errs).length` bail with `setErrors(errs)`. Then `setSaving(true)`.

4. **Build a clean payload.** Trim strings, coerce empties to `null`, convert numeric/date fields
   (`Number(...)`, unix seconds) — don't post raw form strings. Send the same payload shape to
   `api.post("/api/entities", payload)` (create) or `api.put(\`/api/entities/${editTarget.id}\`, payload)`
   (edit), branching on `editTarget`.

5. **Map Laravel 422 errors back to fields.** In `catch`, read `e.errors` (shape
   `Record<string, string[]>`) and set `errors[key] = e.errors[key][0]`. This surfaces backend
   validation inline under the right input.

6. **On success:** close the dialog / `router.push` back to the list, then re-fetch
   (`fetchEntities(pagination.current_page)`). Always clear `saving` in `finally`.

7. **Indonesian labels + `Loader2` on the submit button while `saving`.** Disable submit/cancel
   while saving. Match the list page's null-safety and `@/lib/utils` helpers.

---

## Submit contract (the reusable core)

```tsx
const emptyForm: FormState = { name: "", phone: "", /* … */ }

function openAdd() {
  setEditTarget(null)
  setForm(emptyForm)
  setErrors({})
  setDialogOpen(true)
}

function openEdit(row: Entity) {
  setEditTarget(row)
  setForm({ name: row.name ?? "", phone: row.phone ?? "" /* …with fallbacks */ })
  setErrors({})
  setDialogOpen(true)
}

async function handleSave() {
  const errs: ErrorState = {}
  if (!form.name.trim()) errs.name = "Nama wajib diisi."
  if (Object.keys(errs).length) { setErrors(errs); return }

  setSaving(true)
  setErrors({})
  try {
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      // …coerce numbers/dates here…
    }
    if (editTarget) await api.put(`/api/entities/${editTarget.id}`, payload)
    else await api.post("/api/entities", payload)

    setDialogOpen(false)          // or router.push("/entity") for a full-page form
    fetchEntities(pagination.current_page)
  } catch (err: unknown) {
    const e = err as { errors?: Record<string, string[]> }
    if (e?.errors) {
      const apiErrs: ErrorState = {}
      Object.keys(e.errors).forEach((k) => { apiErrs[k as keyof FormState] = e.errors![k][0] })
      setErrors(apiErrs)
    }
  } finally {
    setSaving(false)
  }
}
```

## Dialog container

```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{editTarget ? "Edit Entity" : "Tambah Entity"}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }) }}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      {/* …more fields… */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
      <Button onClick={handleSave} disabled={saving} className="gap-1.5">
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Simpan
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

For a **full-page form**, drop the `Dialog` wrapper, render the same fields inside `<Card>`s on a
dedicated route (`entity/create/page.tsx` → `order-form-client.tsx`), and `router.push("/entity")`
on success instead of closing a dialog.
