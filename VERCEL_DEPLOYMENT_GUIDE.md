# Panduan Deploy Dashboard ke Vercel

## ❌ Error 404 NOT_FOUND - Penyebab & Solusi

### Penyebab Umum:
1. ❌ Environment variable `FIREBASE_KEY` belum di-set
2. ❌ Backend API gagal build
3. ❌ File `firebase-key.json` tidak ada di local (tapi ini OK, kita pakai env var)

---

## ✅ Langkah-Langkah Deploy yang Benar

### 1. **Set Environment Variable di Vercel Dashboard**

#### A. Buka Vercel Dashboard
   - Login ke https://vercel.com
   - Pilih project: `dashboard-poc`
   - Klik tab **Settings**
   - Klik **Environment Variables** di sidebar

#### B. Tambahkan Variable `FIREBASE_KEY`
   ```
   Key: FIREBASE_KEY
   Value: (paste isi file firebase-key.json sebagai JSON string)
   Environment: Production, Preview, Development (centang semua)
   ```

#### C. Format Value (PENTING!)
   Buka file `api/firebase-key.json` di local, copy **seluruh isi file** sebagai **satu baris JSON string**.
   
   Contoh format yang benar:
   ```json
   {"type":"service_account","project_id":"bestari-c3618","private_key_id":"xxx","private_key":"-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n","client_email":"xxx@xxx.iam.gserviceaccount.com","client_id":"xxx","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"xxx"}
   ```

   ⚠️ **JANGAN** paste dengan line breaks - harus satu baris!

---

### 2. **Pastikan File `.gitignore` Benar**

File `firebase-key.json` **HARUS** ada di `.gitignore` agar tidak ter-commit ke Git:

```gitignore
# Firebase credentials
api/firebase-key.json
firebase-key.json
*.json
```

---

### 3. **Verifikasi `vercel.json` Sudah Benar**

File `vercel.json` di root project:

```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.py"
    }
  ]
}
```

✅ Sudah benar!

---

### 4. **Verifikasi `api/requirements.txt`**

```txt
Flask==3.0.3
firebase-admin==6.5.0
flask-cors==4.0.0
numpy==1.26.4
scikit-fuzzy==0.4.2
```

✅ Sudah benar!

---

### 5. **Push ke Git & Redeploy**

```bash
# Pastikan perubahan terbaru sudah di-commit
git add .
git commit -m "Add PH monitoring and fix deployment config"
git push origin main

# Vercel akan otomatis trigger deployment
```

---

### 6. **Trigger Manual Redeploy di Vercel**

Jika sudah set environment variable:

1. Buka Vercel Dashboard
2. Pilih project `dashboard-poc`
3. Klik tab **Deployments**
4. Klik tombol **Redeploy** pada deployment terakhir
5. Centang **"Use existing Build Cache"** → **UNCHECK** (force rebuild)
6. Klik **Redeploy**

---

## 🔍 Troubleshooting

### Cek Deployment Logs

1. Buka Vercel Dashboard
2. Klik deployment yang gagal
3. Klik tab **Build Logs**
4. Cari error message:
   - ❌ `ModuleNotFoundError` → requirements.txt salah
   - ❌ `Firebase initialization failed` → FIREBASE_KEY tidak di-set
   - ❌ `404 Not Found` → Route tidak match

### Test Backend API Setelah Deploy

Buka di browser:
```
https://dashboard-poc-psi.vercel.app/api/index
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "slave": {
      "suhu": 28.5,
      "heaterPower": 0,
      "ph": 7.0
    },
    "master": {
      "rpm": 0,
      "motorPower": 0
    }
  }
}
```

Jika dapat response JSON seperti di atas → **Backend OK!**

---

## 📋 Checklist Deploy

- [ ] Environment variable `FIREBASE_KEY` sudah di-set di Vercel
- [ ] `firebase-key.json` ada di `.gitignore`
- [ ] `vercel.json` ada di root project
- [ ] `api/requirements.txt` ada dan benar
- [ ] Push ke Git sudah dilakukan
- [ ] Redeploy manual sudah dilakukan (uncheck build cache)
- [ ] Test endpoint `/api/index` → dapat response JSON
- [ ] Buka dashboard → data real-time muncul

---

## 🚀 Setelah Deploy Berhasil

Dashboard akan tersedia di:
```
https://dashboard-poc-psi.vercel.app
```

Fitur yang berfungsi:
- ✅ Real-time monitoring dari Firebase
- ✅ Display 4 KPI: Suhu, PWM, RPM, PH
- ✅ Grafik trend thermal & motor
- ✅ Export CSV logs
- ✅ Dark/Light mode
- ✅ Batch history

---

## ⚠️ Catatan Penting

1. **Firebase Key Security**: 
   - JANGAN commit `firebase-key.json` ke Git
   - Gunakan environment variable di Vercel
   - Pastikan `.gitignore` sudah benar

2. **Backend API**:
   - Endpoint: `/api/index` (GET)
   - Response format: JSON dengan status "success"
   - Polling interval: 2 detik

3. **Frontend**:
   - Fetch menggunakan relative path `/api/index`
   - Otomatis work di production Vercel
   - No hardcoded localhost URL

---

**Dibuat**: 2026-05-06  
**Untuk**: Vercel Deployment Troubleshooting
