# Invoice Share Link — Desain

Tanggal: 2026-07-27
Status: disetujui, siap dibuatkan rencana implementasi
Repo terdampak: `shoesfast-app-fe` (halaman publik + admin) dan `shoesfast-app-be` (kolom, endpoint)
Pasangan: `shoesfast-app-be/docs/superpowers/specs/2026-07-27-invoice-share-link-design.md`
(bagian backend, lebih rinci: migration, config, controller, payload, test)

## Ringkasan

Invoice berhenti berupa berkas PDF yang diunduh admin. Sebagai gantinya tiap order punya
satu tautan publik yang bisa disalin admin dan dikirim ke customer lewat WhatsApp. Halaman
di balik tautan itu menampilkan invoice lengkap dengan **foto tiap item**, dan rincian harga
**per treatment**. Foto bisa diklik untuk membesar.

## Keadaan sekarang

- Invoice dibuat di sisi klien dengan jsPDF: `src/lib/invoice-utils.ts`, dipanggil dari
  `handlePrintInvoice` di `src/app/(admin)/pembayaran/payment-client.tsx:154`. Hasilnya
  langsung `doc.save()` — berkas turun ke komputer admin.
- PDF itu tidak memuat foto item sama sekali, dan nama treatment digabung jadi satu string
  (`"Deep Clean, Unyellowing"`) sehingga harga per treatment hilang.
- `orders_items.photo` **sudah ada**: disimpan sebagai path storage, dikembalikan API sebagai
  URL penuh lewat `asset('storage/…')` (`OrderController.php:123-137`). URL ini publik, tidak
  butuh login.
- Route publik (di luar `auth:sanctum`) sudah ada presedennya: `POST /api/webhook`.
- Frontend punya group `(admin)` (bergerbang auth) dan `login`. Halaman publik jadi sibling baru.

## Keputusan

1. **Tautan menggantikan PDF sepenuhnya.** Tombol "Cetak Invoice" jadi "Salin Link".
   Customer yang ingin menyimpan cukup memakai Print bawaan browser.
   Yang dihapus hanya `src/lib/invoice-utils.ts`. **`jspdf` maupun `jspdf-autotable` tetap
   dipertahankan** — keduanya dipakai `src/lib/pdf-utils.ts` untuk ekspor laporan
   (`import autoTable` di baris 2, dipanggil di baris 151 dan 326).

2. **Alamat tautan memakai token acak, bukan ID order.** `/invoice/<token>` dengan token 40
   karakter acak. Memakai `/invoice/123` akan membuat siapa pun bisa menaikkan angkanya dan
   membaca invoice customer lain — nama, telepon, alamat, harga, riwayat bayar — karena
   halaman ini tanpa login.

3. **Tautan punya masa berlaku 30 hari, dan token tidak berubah saat disegarkan.** Tiap admin
   menekan "Salin Link", `invoice_expires_at` di-reset ke 30 hari ke depan sementara
   `invoice_token` tetap sama. Efeknya: customer yang menyimpan tautan lama di chat WhatsApp
   tinggal membukanya lagi setelah admin menyegarkan — tidak perlu alamat baru. Tanpa admin
   menyegarkan, tautan tetap mati setelah 30 hari.

4. **Rincian harga ditampilkan per treatment**, dengan `item.price` sebagai subtotal yang
   mengikat. Harga tiap treatment sudah dikirim API (`treatments[].price`), jadi tidak ada
   kerja tambahan di backend. Kalau jumlah harga treatment berbeda dari `item.price` (kolom
   itu bisa diisi manual), yang ditampilkan sebagai subtotal tetap `item.price` — angka yang
   benar-benar ditagih.

5. **Tata letak item berupa kartu, bukan tabel.** Customer hampir selalu membuka tautan dari
   WhatsApp di ponsel; tabel lima kolom menyempit dan foto jadi thumbnail 40px, padahal
   fotonya justru inti fitur ini. Satu tata letak untuk semua ukuran layar.

6. **Halaman publik tinggal di Next.js, bukan Blade.** Proyek backend sengaja tanpa Blade UI
   dan tanpa Tailwind; menaruh halaman di sana berarti menulis ulang seluruh styling dan
   mengunggah manual lewat FTP tiap kali tampilan diubah.

7. **Foto: klik untuk membesar (lightbox).** Putaran 360 derajat **tidak** masuk versi ini —
   lihat bagian "Spec lanjutan".

## Lingkup

Masuk:

- Kolom `invoice_token` + `invoice_expires_at` di tabel `orders`
- Berkas `not-found.tsx` berbahasa Indonesia untuk halaman invoice (Next tanpa itu menampilkan
  halaman 404 bawaan berbahasa Inggris, melanggar aturan salinan teks proyek)
- Endpoint admin untuk membuat/menyegarkan tautan
- Endpoint publik untuk membaca invoice
- Halaman publik `/invoice/[token]` beserta lightbox foto
- Penggantian tombol di halaman pembayaran
- Penghapusan jalur PDF invoice

Keluar:

- Putaran 360 derajat dan segala pipeline foto ganda (spec tersendiri)
- Pengiriman otomatis tautan lewat WhatsApp/WAHA — admin menyalin dan mengirim sendiri
- Pencabutan tautan secara manual sebelum masa berlaku habis
- Perubahan pada `pdf-utils.ts` dan laporan-laporan

## Backend (`shoesfast-app-be`)

### Migration

Satu migration menambah dua kolom di `orders`. Dijaga `Schema::hasColumn` agar idempoten
terhadap DB produksi yang sudah termigrasi, sesuai aturan di CLAUDE.md.

```php
$table->string('invoice_token', 40)->nullable()->unique()->after('note');
$table->integer('invoice_expires_at')->nullable()->after('invoice_token');
```

`invoice_expires_at` bertipe integer unix detik, mengikuti konvensi tabel ini
(`$dateFormat = 'U'`, kolom tanggal di-cast `integer`).

### Model

`App\Models\Order`: tambahkan kedua kolom ke `$fillable`, dan `invoice_expires_at` ke
`$casts` sebagai `integer`.

### Endpoint 1 — buat / segarkan tautan (butuh auth)

```
POST /api/orders/{id}/invoice-link
→ 200 { "url": "https://app.example.com/invoice/<token>", "expires_at": 1790000000 }
```

Ditaruh di `OrderController` sebagai method `invoiceLink`. Route **dideklarasikan sebelum**
`Route::apiResource('orders', …)` mengikuti aturan urutan route yang sudah dipegang proyek
ini.

Logika:

1. Ambil order lewat scope biasa (admin login, branch scope berlaku normal — admin cabang
   tidak boleh membuat tautan untuk order cabang lain).
2. Kalau `invoice_token` kosong, isi dengan `Str::random(40)`. Kalau sudah ada, **biarkan**.
3. Set `invoice_expires_at = time() + 30 * 86400`, selalu, baik token baru maupun lama.
4. Simpan, lalu rakit URL dari base URL frontend + `/invoice/<token>`.

Soal base URL frontend: `FRONTEND_URL` saat ini hanya dibaca lewat `env()` langsung di
`config/cors.php:17`, dan isinya **boleh berupa beberapa origin yang dipisah koma**. Tidak
ada key config yang bisa dipanggil. Jadi tambahkan satu key di `config/app.php`:

```php
'frontend_url' => trim(explode(',', (string) env('FRONTEND_URL', ''))[0]),
```

Diambil entri pertama karena isinya bisa jamak, dan ditaruh di config (bukan `env()` di
controller) supaya tetap benar saat `config:cache` aktif di produksi. Kalau kosong, endpoint
menjawab 500 dengan pesan yang jelas — lebih baik gagal keras daripada menyalin tautan
`/invoice/<token>` tanpa domain.

### Endpoint 2 — baca invoice (publik)

```
GET /api/public/invoice/{token}
→ 200 payload | 404 token tidak dikenal | 410 tautan kedaluwarsa
```

Controller baru `PublicInvoiceController`. Route ditaruh di luar grup `auth:sanctum`,
bersebelahan dengan `webhook`, dan diberi `throttle:60,1` supaya token 40 karakter tidak
bisa digempur brute force.

Pencarian order ditulis eksplisit tanpa branch scope:

```php
$order = Order::withoutBranchScope()->where('invoice_token', $token)->first();
```

`BranchContext::getActiveBranch()` memang sudah mengembalikan `null` saat tidak ada user
login (`BranchContext.php:31-35`) sehingga global scope-nya diam dengan sendirinya — tapi
mengandalkan itu berarti fitur ini diam-diam bergantung pada perilaku yang tidak pernah
dijanjikan. `withoutBranchScope()` membuat niatnya terbaca dan tahan kalau `BranchContext`
berubah.

Kalau order tidak ketemu → 404. Kalau `invoice_expires_at` kosong atau sudah lewat → 410
dengan body `{ "message": "Link invoice sudah kedaluwarsa", "branch": { "name", "whatsapp" } }`
— cabang ikut dikirim supaya halaman kedaluwarsa bisa memberi tahu customer harus menghubungi
siapa. Hanya nama dan nomor toko; tidak ada data customer di respons ini.

`branch.whatsapp` bersumber dari `projects.whatsapp` dengan fallback ke `projects.phone`
memakai `?:` (bukan `??`) — skema lama menyimpan kosong sebagai `''` sesering `NULL`. Tidak
ada key `branch.phone`.

### Bentuk payload

Menyatukan yang sekarang butuh dua panggilan (`/orders/{id}/items` dan
`/payments/order/{id}`) menjadi satu:

```json
{
  "code": "INV-2026-001",
  "date": 1785000000,
  "due_date": 1785259200,
  "payment_status": "paid",
  "branch": { "name": "Cabang Kemang", "whatsapp": "0812xxxxxxx" },
  "customer": { "name": "Budi Santoso", "phone": "0812…", "email": null, "address": "Jl. …" },
  "items": [
    {
      "name": "Nike Air Force 1",
      "photo": "https://api.example.com/storage/items/item-12-1.jpg",
      "price": 195000,
      "discount": 0,
      "treatments": [
        { "name": "Deep Clean", "price": 75000 },
        { "name": "Unyellowing", "price": 120000 }
      ]
    }
  ],
  "total_price": 195000,
  "total_paid": 195000,
  "credit": 0,
  "payments": [
    { "date": 1785300000, "nominal": 195000, "note": "Transfer BCA" }
  ]
}
```

Perhitungan `due_date` (tanggal order + 3 hari), `total_paid`, `credit`, dan
`payment_status` (`paid` / `partial` / `unpaid`) **disalin persis** dari
`PaymentController.php:77-105`, supaya angka di invoice publik dan di halaman pembayaran
tidak pernah berselisih.

`branch.whatsapp` dipakai halaman "tautan kedaluwarsa" agar customer tahu harus menghubungi
siapa.

## Frontend (`shoesfast-app-fe`)

### Halaman publik

Berkas baru `src/app/invoice/[token]/page.tsx` — sibling dari `login/`, di luar group
`(admin)` sehingga tidak melewati gerbang auth di `(admin)/layout.tsx`.

Berupa server component yang mengambil data langsung:

```ts
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/invoice/${token}`, {
  cache: "no-store",
})
```

**Sengaja tidak lewat `api` dari `@/lib/api`.** Klien itu membaca token dari `localStorage`
dan melempar ke `/login` pada tiap 401 — dua-duanya salah untuk halaman tanpa login. Ini
satu-satunya pengecualian dari aturan "semua panggilan lewat `api`", dan alasannya ditulis
sebagai komentar di berkasnya supaya tidak dikira kelalaian.

Penanganan status: 404 → `notFound()`. 410 → halaman "Link sudah kedaluwarsa, silakan
hubungi Shoesfast" beserta nomor WhatsApp cabang. Selain itu → halaman galat umum.

`generateMetadata` menghasilkan preview tautan di WhatsApp: judul `Invoice <code> · Shoesfast`,
deskripsi nama customer dan total.

### Susunan halaman

Mobile-first; kartu melebar di layar besar. Salinan teks berbahasa Indonesia,
`formatCurrency` dan `formatDate` diambil dari `@/lib/utils` (tidak ditulis ulang).

```
SHOESFAST                                   INVOICE
Cabang Kemang                        No: INV-2026-001
                                Tanggal: 27 Juli 2026
                                        ⟨ LUNAS ⟩

Ditagihkan kepada
Budi Santoso · 0812xxxx · Jl. Kemang Raya 12

┌──────────────────────────────────────────┐
│ ┌────────┐   Nike Air Force 1            │
│ │        │                               │
│ │  FOTO  │   Deep Clean        Rp  75.000│
│ │        │   Unyellowing       Rp 120.000│
│ └────────┘   ───────────────────────────  │
│              Subtotal         Rp 195.000 │
└──────────────────────────────────────────┘
        (satu kartu per item)

                    Total       Rp 195.000
                    Terbayar    Rp 195.000
                    Sisa        Rp         0

Riwayat Pembayaran
27 Jul 2026    Rp 195.000    Transfer BCA
```

Baris "Diskon" hanya dirender kalau `item.discount > 0`. Badge status memakai warna yang
sama dengan PDF lama: hijau LUNAS, biru CICILAN, merah BELUM BAYAR.

### Komponen foto

`src/app/invoice/[token]/invoice-photo.tsx`, satu-satunya berkas `"use client"` di halaman
ini: menampilkan foto item dan membuka lightbox layar penuh saat diklik. Foto `null` →
kotak abu berikon, bukan gambar rusak.

Komponen inilah yang isinya ditukar saat spec 360 dikerjakan. Sisa halaman tidak perlu
disentuh lagi.

### Perubahan di halaman admin

Di `src/app/(admin)/pembayaran/payment-client.tsx`:

- `handlePrintInvoice` diganti `handleCopyInvoiceLink`: `POST /api/orders/{id}/invoice-link`
  lewat klien `api` biasa → `navigator.clipboard.writeText(url)` → toast
  `"Link invoice disalin"`. Gagal → toast `"Gagal membuat link invoice"`.
- Tombol memakai ikon `Link2` dengan label "Salin Link", di dua tempat yang sekarang dipakai:
  aksi baris tabel (sekitar baris 549) dan dialog detail (sekitar baris 810). Spinner
  `Loader2` selama proses, seperti sekarang.
- Impor `downloadInvoicePDF` dihapus.

### Penghapusan

Hanya berkas `src/lib/invoice-utils.ts`.

**Tidak ada dependensi yang dicopot.** `pdf-utils.ts` mengimpor `jspdf` **dan**
`jspdf-autotable` (baris 2, dipanggil di baris 151 dan 326, plus augmentasi tipe modul di
baris 6-8) untuk ekspor laporan. Mencopot salah satunya merusak seluruh `laporan-*` sekaligus
menggagalkan `npm run build`.

## Kasus pinggir

- Order tanpa item → daftar kartu diganti pesan "Tidak ada rincian item".
- `customer` null (order walk-in) atau relasi terhapus → semua field pakai `?? "-"`, sesuai
  aturan null-safe proyek. Tidak boleh ada `customer.name` telanjang.
- Item tanpa treatment → hanya baris subtotal yang tampil.
- `photo` null → placeholder berikon.
- Order yang belum pernah disalin tautannya → `invoice_token` null, tidak ada halaman publik
  yang bisa dibuka. Wajar.

## Pengujian

Backend, satu feature test baru (proyek memakai `composer test`, sudah ada dua test):

- token dibuat saat pertama diminta, dan **tetap sama** saat diminta ulang
- `invoice_expires_at` ter-reset tiap permintaan
- `GET /api/public/invoice/{token}` menjawab 200 untuk token hidup, 404 untuk token asing,
  410 untuk token yang sudah lewat masa berlaku
- endpoint publik bisa diakses tanpa login

Frontend tidak punya unit test sama sekali (lihat CLAUDE.md); gerbangnya tetap
`npm run build` (sekaligus type-check) dan `npm run lint`.

## Batasan yang diambil sadar

- `navigator.clipboard` hanya berfungsi di HTTPS atau localhost. Frontend dideploy ke Vercel
  yang selalu HTTPS, jadi aman. Kalau kelak admin dibuka lewat HTTP polos, tombolnya diam.
  Ditandai komentar `ponytail:` di kodenya; fallback `document.execCommand("copy")`
  ditambahkan hanya kalau benar-benar terjadi.
- Tidak ada cara mencabut tautan sebelum masa berlakunya habis. Kalau nanti dibutuhkan,
  tambahkan kolom `invoice_revoked_at` dan satu pemeriksaan di endpoint publik.
- Halaman publik tidak di-cache (`no-store`) supaya status pembayaran selalu mutakhir. Beban
  ini kecil karena tautan hanya dibuka customer bersangkutan.

## Spec lanjutan — putaran 360 derajat

Diputuskan dikerjakan terpisah setelah fitur ini jalan. Alasannya: 360 sungguhan butuh 24-36
frame per item, sementara jalur upload sekarang menempelkan base64 di dalam JSON payload
(`docs/patterns/image-upload.md`) — 36 frame lewat jalur itu berarti satu POST berisi 7-10 MB
dan akan gagal. Jadi 360 memerlukan tabel foto baru, endpoint upload multi-file, UI upload di
admin, viewer spin di halaman publik, plus alur kerja staff memotret memakai turntable.

Titik sambungnya sudah disiapkan: cukup tukar isi `invoice-photo.tsx`, bagian lain halaman
invoice tidak berubah.
