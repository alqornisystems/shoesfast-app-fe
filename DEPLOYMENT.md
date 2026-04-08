# Panduan Deployment Shoesfast Frontend ke Vercel

## Persiapan

### 1. Buat Akun Vercel (Gratis)
1. Kunjungi https://vercel.com/signup
2. Sign up dengan GitHub/GitLab/Bitbucket (recommended) atau email
3. Verifikasi email jika menggunakan email

### 2. Push Code ke Git Repository
```bash
# Jika belum init git
cd frontend
git init

# Add remote repository (GitHub/GitLab/Bitbucket)
git remote add origin <URL_REPOSITORY_ANDA>

# Commit dan push
git add .
git commit -m "Initial commit for Vercel deployment"
git push -u origin main
```

---

## Deployment Step-by-Step

### Opsi 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project
1. Login ke https://vercel.com/dashboard
2. Klik **"Add New..."** → **"Project"**
3. Pilih repository Git Anda
4. Vercel akan auto-detect Next.js

#### Step 2: Configure Project
```
Framework Preset: Next.js
Root Directory: frontend (jika monorepo, atau ./ jika frontend standalone)
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
```

#### Step 3: Environment Variables
Tambahkan environment variable berikut:

**Key**: `NEXT_PUBLIC_API_URL`
**Value**: URL backend Anda (contoh: `https://api.shoesfast.id` atau `https://shoesfast.id/api`)

Cara tambah:
1. Scroll ke bawah ke bagian "Environment Variables"
2. Klik "Add"
3. Masukkan key dan value
4. Pilih environment: Production, Preview, Development (centang semua)
5. Klik "Save"

#### Step 4: Deploy
1. Klik **"Deploy"**
2. Tunggu proses build (3-5 menit)
3. Selesai! Anda akan dapat URL: `https://shoesfast-admin-xxxx.vercel.app`

---

### Opsi 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login
```bash
vercel login
```

#### Step 3: Deploy
```bash
cd frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Pilih account Anda
- Link to existing project? **N** (untuk deployment pertama)
- What's your project's name? **shoesfast-admin** (atau nama lain)
- In which directory is your code located? **./** (current directory)
- Want to override the settings? **N** (Vercel sudah detect Next.js)

#### Step 4: Set Environment Variable
```bash
vercel env add NEXT_PUBLIC_API_URL production
```
Masukkan URL backend Anda ketika diminta.

#### Step 5: Deploy to Production
```bash
vercel --prod
```

---

## Setup Custom Domain (Gratis!)

### Step 1: Tambah Domain di Vercel
1. Buka project Anda di Vercel Dashboard
2. Klik tab **"Settings"** → **"Domains"**
3. Klik **"Add"**
4. Masukkan domain Anda, contoh: `admin.shoesfast.id`
5. Klik **"Add"**

### Step 2: Setup DNS
Vercel akan memberikan instruksi DNS. Biasanya ada 2 cara:

**Cara A: CNAME Record (Recommended untuk subdomain)**
```
Type: CNAME
Name: admin (untuk admin.shoesfast.id)
Value: cname.vercel-dns.com
TTL: 3600 (atau Auto)
```

**Cara B: A Record (Untuk root domain)**
```
Type: A
Name: @ (untuk shoesfast.id)
Value: 76.76.21.21
TTL: 3600

Type: AAAA
Name: @
Value: 2606:4700:10::6814:1515
TTL: 3600
```

### Step 3: Tambahkan DNS di Provider Domain Anda
1. Login ke panel domain Anda (Niagahoster, Rumahweb, Cloudflare, dll)
2. Cari menu **"DNS Management"** atau **"DNS Records"**
3. Tambahkan record sesuai instruksi dari Vercel
4. Klik **"Save"**

### Step 4: Verifikasi
1. Kembali ke Vercel Dashboard
2. Klik **"Refresh"** atau tunggu beberapa menit
3. Status akan berubah jadi **"Valid Configuration"** ✓
4. SSL certificate akan otomatis di-provision (5-10 menit)
5. Domain siap digunakan dengan HTTPS!

---

## Update Production (Re-deploy)

### Auto-Deploy (Recommended)
Setiap kali Anda push ke branch `main`, Vercel otomatis deploy ulang!

```bash
git add .
git commit -m "Update feature XYZ"
git push origin main
```

### Manual Deploy via CLI
```bash
cd frontend
vercel --prod
```

---

## Troubleshooting

### Error: "NEXT_PUBLIC_API_URL is not defined"
**Solusi**: Pastikan environment variable sudah ditambahkan di Vercel Dashboard → Settings → Environment Variables

### Error: "Build failed"
**Solusi**:
1. Cek build log di Vercel Dashboard
2. Pastikan `npm run build` berhasil di local:
   ```bash
   cd frontend
   npm run build
   ```
3. Fix error, commit, dan push ulang

### Domain tidak bisa diakses setelah 30 menit
**Solusi**:
1. Cek DNS propagation: https://dnschecker.org
2. Pastikan DNS record sudah benar di panel domain
3. Flush DNS cache di komputer:
   ```bash
   # Windows
   ipconfig /flushdns

   # macOS
   sudo dscacheutil -flushcache

   # Linux
   sudo systemd-resolve --flush-caches
   ```

### CORS Error saat hit API
**Solusi**: Tambahkan CORS header di backend Laravel

File: `backend/config/cors.php`
```php
'allowed_origins' => [
    'https://admin.shoesfast.id',
    'https://shoesfast-admin.vercel.app',
    'http://localhost:3000', // untuk development
],
```

Atau gunakan wildcard (tidak disarankan untuk production):
```php
'allowed_origins' => ['*'],
```

---

## Preview Deployments (Bonus)

Setiap kali Anda push ke branch selain `main`, Vercel akan buat deployment preview:

```bash
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

Vercel akan comment di Pull Request dengan URL preview:
`https://shoesfast-admin-git-feature-new-feature.vercel.app`

Berguna untuk testing sebelum merge ke production!

---

## Monitoring & Analytics

### View Deployment Logs
1. Vercel Dashboard → Project → Deployments
2. Klik deployment yang ingin dilihat
3. Tab "Build Logs" untuk build process
4. Tab "Functions" untuk runtime logs

### Analytics (Optional, berbayar)
Vercel Analytics bisa track:
- Page views
- User flow
- Performance metrics
- Real User Monitoring (RUM)

Aktifkan di: Settings → Analytics (butuh upgrade ke Pro plan)

---

## Biaya

**Hobby Plan (Free Forever):**
- ✅ Unlimited deployments
- ✅ Unlimited custom domains
- ✅ SSL certificates (auto)
- ✅ 100GB bandwidth/bulan
- ✅ 100 GB-hours serverless function execution
- ✅ Preview deployments

**Cukup untuk 90% aplikasi small-medium!**

**Pro Plan ($20/user/month):**
- 1TB bandwidth
- Advanced analytics
- Team collaboration
- Password protection
- Higher limits

---

## Checklist Deployment

- [ ] Code sudah di push ke Git repository
- [ ] Vercel account sudah dibuat
- [ ] Project sudah di-import ke Vercel
- [ ] Environment variable `NEXT_PUBLIC_API_URL` sudah ditambahkan
- [ ] Build berhasil (status: Ready)
- [ ] Aplikasi bisa diakses via URL Vercel
- [ ] Custom domain sudah ditambahkan (opsional)
- [ ] DNS record sudah dikonfigurasi (opsional)
- [ ] SSL certificate sudah aktif (auto)
- [ ] Test login dan fitur utama
- [ ] CORS sudah dikonfigurasi di backend

---

## Next Steps

1. **Setup CI/CD**: Auto-deploy sudah aktif via Git push
2. **Setup Monitoring**: Install error tracking (Sentry, LogRocket)
3. **Setup Backup**: Gunakan Git sebagai version control
4. **Documentation**: Update API documentation dengan URL production

---

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Vercel Community: https://github.com/vercel/vercel/discussions

Jika ada masalah deployment, cek:
1. Build logs di Vercel Dashboard
2. Browser console untuk client-side errors
3. Backend logs untuk API errors
