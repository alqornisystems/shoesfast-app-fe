# Image Upload Pattern (base64)

Photos are uploaded as **base64 data URLs** stored in a form string field and posted inline in the
JSON payload — there is no multipart / file endpoint. Used in ~9 pages (pelanggan, karyawan,
cabang, layanan, pembayaran, pengeluaran, pesanan, izin, …).

**Canonical:** `src/app/(admin)/pelanggan/customer-client.tsx`

---

## The 4 rules

1. **Read the file to a data URL** with `FileReader.readAsDataURL` and store `reader.result` (a
   `data:image/…;base64,…` string) directly on the form field.

2. **Store as a plain string** on your `form` state (`photo: string`). Empty string = no photo.
   On edit, seed it from the existing value (`row.photo ?? ""`) — the backend returns the same
   base64/URL string.

3. **Post it inline** in the JSON payload: `photo: form.photo || null`. No separate upload call.

4. **UI:** hidden `<input type="file" accept="image/*">` triggered by a button/label, a preview
   `<img>`, and a clear button that sets the field back to `""`.

---

## Handler + field

```tsx
function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onloadend = () => setForm({ ...form, photo: reader.result as string })
  reader.readAsDataURL(file)
}
```

```tsx
<div className="space-y-1.5">
  <Label>Foto</Label>
  {form.photo ? (
    <div className="relative w-24 h-24">
      <img src={form.photo} alt="" className="w-24 h-24 rounded-lg object-cover border" />
      <Button
        type="button" variant="destructive" size="icon"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
        onClick={() => setForm({ ...form, photo: "" })}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  ) : (
    <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted">
      <Upload className="h-5 w-5" />
      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
    </label>
  )}
</div>
```

In the payload (see [form.md](./form.md)):

```tsx
const payload = { /* … */, photo: form.photo || null }
```

> Base64 inflates the JSON ~33%; keep it to reasonably small images. If a large-image feature is
> ever needed, that's the point to introduce a real upload endpoint — until then, match this pattern.
