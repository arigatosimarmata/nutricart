# 🛒 NutriCart - Production Deployment Guide for Google Cloud Platform (GCP)

Panduan ini berisi panduan teknis langkah demi langkah untuk melakukan deploy aplikasi **NutriCart** (Go Fiber Backend + React Frontend SPA) yang telah di-kontainerisasi menggunakan Docker ke **Google Cloud Run** pada akun GCP mandiri Anda yang lain.

---

## 🏗️ Arsitektur Produksi & Komponen Utama

Aplikasi ini dirancang dengan standar modern, aman, dan berkinerja tinggi menggunakan pendekatan **Single Container Deployment**:
- **Backend Service:** Ditulis menggunakan bahasa Go (menggunakan framework **Fiber**) yang melayani API RESTful (`/api/v1/*`) dengan efisiensi memori tinggi.
- **Frontend App:** Aplikasi Single Page Application (SPA) berbasis **React** dan **Vite** yang dikompilasi secara statis ke direktori `/app/dist`, dan dilayani langsung (*static serving*) oleh backend Go pada rute selain `/api/*`.
- **Database Layer:** Mendukung Relational Database (disarankan menggunakan **Google Cloud SQL** untuk MySQL / PostgreSQL) melalui koneksi secure pool.
- **Security:** Konfigurasi Non-Root User dalam Alpine Runner Container, kepatuhan CORS ketat, otentikasi JWT, dan penyimpanan variabel sensitif menggunakan **GCP Secret Manager**.

---

## 📋 1. Kebutuhan Awal (Prerequisites)

Sebelum melakukan proses migrasi dan deployment pada akun GCP Anda yang baru, pastikan Anda telah menyiapkan data dan komponen berikut:

### A. Informasi Proyek GCP Anda
1. **GCP Project ID:** ID Proyek target di akun baru (contoh: `nutricart-production-9988`).
2. **GCP Region:** Region geografis terdekat untuk meluncurkan layanan (contoh: `asia-southeast1` untuk Jakarta/Singapore).
3. **Akun Gcloud CLI:** Pastikan Anda memiliki hak akses peran penuh (`Owner` atau `Editor` + `Secret Manager Admin` + `Cloud SQL Admin`) pada proyek tersebut.

### B. Software Lokal yang Diperlukan
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk testing lokal).
- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) telah terpasang dan dikonfigurasi melalui terminal lokal.
- [Go 1.21+](https://go.dev/doc/install) (opsional, untuk pengembangan backend lokal).
- [Node.js 20+](https://nodejs.org/) (opsional, untuk pengembangan frontend lokal).

---

## ⚙️ 2. Variabel Lingkungan & Konfigurasi (Production Env)

Gunakan daftar ini untuk mendaftarkan secrets Anda di **GCP Secret Manager** demi keamanan maksimum:

| Nama Variabel | Deskripsi | Keterangan / Contoh Nilai |
| :--- | :--- | :--- |
| `ENV` | Mode lingkungan aplikasi | `production` |
| `PORT` | Port internal container | `3000` (Wajib, Cloud Run akan me-route ke port ini) |
| `JWT_SECRET` | Kunci enkripsi acak untuk verifikasi login JWT | `GantiDenganStringSkenarioPanjangDanUnik` |
| `DB_CONN_STRING` | Link koneksi Database Gorm (Format MySQL) | `user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local` |
| `GEMINI_API_KEY` | Kunci otorisasi integrasi AI untuk resep asisten gizi | Kunci API resmi dari Google AI Studio / GCP Console |

---

## 🚀 3. Langkah Demi Langkah Deployment ke GCP Baru

Jalankan perintah ini dari root direktori proyek Anda menggunakan terminal lokal:

### Langkah 3.1: Hubungkan gcloud CLI dengan Akun GCP Baru
Masuk ke akun google Anda yang memiliki project target:
```bash
# Login ke GCP Console melalui browser Anda
gcloud auth login

# Set project aktif ke target deployment
gcloud config set project YOUR_GCP_PROJECT_ID
```

### Langkah 3.2: Aktifkan API Layanan GCP yang Diperlukan
Jalankan satu perintah ini untuk memastikan semua api microservices yang dipakai aktif berjalan:
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com
```

### Langkah 3.3: Amankan Kredensial Menggunakan GCP Secret Manager
Buat rahasia (secrets) di Cloud Console agar tidak bocor ke dalam source-code:
```bash
# Buat secret untuk database connection string
echo -n "user:password@tcp(IP_DATABASE:3306)/nutricart" | gcloud secrets create DB_CONN_STRING --data-file=-

# Buat secret untuk JWT key
echo -n "KUNCI_RAHASIA_SUPER_RANDOM_ANDA_123!" | gcloud secrets create JWT_SECRET --data-file=-

# Buat secret untuk Gemini API Key
echo -n "API_KEY_GEMINI_ANDA" | gcloud secrets create GEMINI_API_KEY --data-file=-
```

### Langkah 3.4: Buat Repository Docker di Artifact Registry
GCP Artifact Registry digunakan untuk menyimpan image container Docker hasil kompilasi:
```bash
gcloud artifacts repositories create nutricart-repo \
    --repository-format=docker \
    --location=asia-southeast1 \
    --description="Repository Docker Image Aplikasi NutriCart"
```

### Langkah 3.5: Build Image Kontainer Menggunakan Cloud Build
Kita akan mengunggah source-code ke Cloud Build untuk melakukan kompilasi biner Go dan React secara remote dan menyimpannya di Artifact Registry:
```bash
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/nutricart-repo/app:v1.0.0 .
```

*Keuntungan:* Proses ini memakan waktu kurang dari 3 menit karena dijalankan di server performa tinggi GCP tanpa membebani komputer lokal Anda.

### Langkah 3.6: Deployment Instant ke GCP Cloud Run
Jalankan kontainer yang telah dikompilasi secara serverless ke Cloud Run, sambungkan dengan Secret Manager yang telah di-set di awal:

```bash
gcloud run deploy nutricart-service \
    --image=asia-southeast1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/nutricart-repo/app:v1.0.0 \
    --region=asia-southeast1 \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --set-env-vars=ENV=production \
    --set-secrets=DB_CONN_STRING=DB_CONN_STRING:latest,JWT_SECRET=JWT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

Setelah perintah di atas sukses, terminal Anda akan secara otomatis memunculkan **Service URL** publik yang aman (HTTPS) (contoh: `https://nutricart-service-xxxxx.run.app`). Anda sekarang dapat membukanya langsung di browser atau mengintegrasi fungsionalitas front-end dengan URL baru tersebut secara mandiri!

---

## 🛠️ 4. Pengujian & Pemeliharaan (Maintenance)

### Memeriksa Logs Aplikasi yang Berjalan di Produksi
Untuk mengecek log audit payload, debug koneksi database, atau melihat error server secara real-time, Anda dapat membuka log viewer GCP Cloud Run menggunakan perintah CLI berikut:
```bash
gcloud beta run services logs tail nutricart-service --region=asia-southeast1
```

### Pengembangan Lokal (Local Multi-stage Docker Run)
Jika Anda ingin mengetes kecocokan kontainer di dalam komputer lokal terlebih dahulu sebelum deploy ke awan:
```bash
# 1. Build image lokal
docker build -t nutricart:local .

# 2. Jalankan container lokal (sambungkan dengan variabel lokal Anda)
docker run -p 3000:3000 \
  -e ENV=development \
  -e PORT=3000 \
  -e DB_CONN_STRING="root:password@tcp(127.0.0.1:3306)/nutricart" \
  -e JWT_SECRET="lokalsecret123" \
  -e GEMINI_API_KEY="AI_STUDIO_KEY" \
  nutricart:local
```
Silakan buka `http://localhost:3000` di browser untuk mengakses penuh aplikasi utuh Anda.

---
*Dokumentasi rujukan kompilasi biner didesain kokoh berbasis standar Docker Multi-Stage dengan optimalisasi minimalis Alpine Image.*
