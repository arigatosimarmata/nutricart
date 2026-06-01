# 🛒 NutriCart API Gateway - Dokumentasi Lengkap API (v1.0.0)

Dokumentasi ini dirancang khusus untuk tim **Front-End Developer** agar dapat mengintegrasikan UI/UX aplikasi NutriCart dengan sistem back-end Go secara lancar, aman, dan berkinerja tinggi.

---

## 📌 1. Informasi Umum (General Info)

- **Base URL Pengembangan:** `https://ais-dev-jy5cbsefo3aygqfjrulxy4-77704760598.asia-southeast1.run.app`
- **Header Standar:** Semua request data mutatif menggunakan format JSON.
  - `Content-Type: application/json`
  - `Accept: application/json`
- **CORS Kebijakan:** Diperbolehkan dari origin mana pun (`AllowOrigins: *`) sehingga aman dari pembatasan browser saat development.

---

## 🔒 2. Mekanisme Otentikasi (Authentication)

Beberapa rute kritis dilindungi oleh middleware JWT (JSON Web Token). Untuk mengakses rute yang dilindungi, sertakan token akses (`access_token`) pada header HTTP request Anda:

```http
Authorization: Bearer <your_access_token>
```

Jika token tidak disertakan, kedaluwarsa, atau tidak valid, server akan merespons dengan kode status `401 Unauthorized` secara langsung.

---

## 🚦 3. Daftar Endpoint API

### 🏥 A. Sistem & Health Check (Tanpa Auth)

Digunakan untuk memeriksa apakah layanan API online dan merespons dengan benar.

- **Rute:** `GET /health`
- **Format Respons (200 OK):**
  ```json
  {
    "app": "NutriCart API Service",
    "status": "healthy"
  }
  ```

---

### 🔑 B. Otentikasi (Authentication Routes)

#### 1. Masuk Lewat Google OAuth (`POST /api/v1/auth/google`)
Mengirim `id_token` yang diperoleh dari SDK Google Login di sisi front-end untuk diverifikasi oleh sistem back-end, kemudian melahirkan token otentikasi internal NutriCart.

- **Payload Request (Body - JSON):**
  | Nama Kolom | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `id_token` | `string` | Ya | ID Token JWT asli dari Google Sign-In SDK |

  *Contoh Payload:*
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhMmIzY..."
  }
  ```

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "user_id": "google-sub-id-123456",
      "email": "user@gmail.com",
      "name": "Arigato Simarmata",
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh..."
    }
  }
  ```

- **Respons Gagal (400 Bad Request):**
  ```json
  {
    "status": "error",
    "error_code": "MISSING_ID_TOKEN",
    "message": "Google id_token wajib disertakan."
  }
  ```

- **Respons Gagal (401 Unauthorized):**
  ```json
  {
    "status": "error",
    "error_code": "GOOGLE_AUTH_FAILED",
    "message": "crypto/rsa: verification error / token expired"
  }
  ```

#### 2. Perbarui Sesi Token (`POST /api/v1/auth/refresh`)
Memperbarui token akses (`access_token`) baru menggunakan token penyegar (`refresh_token`) yang masih berlaku tanpa memaksa user login kembali dari awal.

- **Payload Request (Body - JSON):**
  | Nama Kolom | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `refresh_token` | `string` | Ya | Token penyegar yang didapat saat login pertama |

  *Contoh Payload:*
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh..."
  }
  ```

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInpa..."
    }
  }
  ```

---

### 🥗 C. Resep & Informasi Gizi (Recipe & Nutrition Routes)

#### 1. Pindai Nutrisi Barcode Produk (`GET /api/v1/nutrition/barcode/:barcode_val`)
Melihat ringkasan kandungan nutrisi nasional dan status keamanan anak untuk sebuah produk kemasan berdasarkan kode barcodenya.

- **Parameter Rute (URL Param):**
  - `:barcode_val` (Wajib, `string`): Kode barcode numerik produk (contoh: `8999999123456`)

- **Format Request:**
  `GET /api/v1/nutrition/barcode/8992696404456`

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "barcode_value": "8992696404456",
      "product_name": "Susu Cair UHT Full Cream",
      "brand": "Ultra Milk",
      "packing_size": "250 ml",
      "is_safe_for_children": true,
      "nutritional_facts": {
        "calories_kcal": 150,
        "protein_g": 8.0,
        "carbohydrates_g": 12.0,
        "fat_g": 7.0,
        "fiber_g": 0.0,
        "dominant_tag": "High Protein"
      }
    }
  }
  ```

- **Respons Gagal (404 Not Found):**
  ```json
  {
    "status": "error",
    "error_code": "BARCODE_NOT_FOUND",
    "message": "Kode barcode produk belum terdaftar dalam basis gizi rujukan nasional."
  }
  ```

#### 2. Rekomendasi Resep Gizi AI (`POST /api/v1/recipes/ai-suggest`)
🔑 **Membutuhkan Header Authorization**

Menciptakan kecocokan resep yang direkomendasikan secara cerdas berbasis batasan gizi anggota keluarga serta stok bahan yang tersisa di dalam kulkas.

- **Payload Request (Body - JSON):**
  | Nama Kolom | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `family_members` | `array` | Ya | Daftar objek profil anggota keluarga untuk perhitungan gizi |
  | `fridge_available_ingredients` | `array of string` | Ya | Bahan makanan cadangan di kulkas (boleh kosong `[]`) |

  *Struktur Objek `family_members`:*
  - `name` (`string`): Nama anggota keluarga
  - `gender` (`string`): Jenis Kelamin (`"Pria"` atau `"Wanita"`)
  - `age` (`int`): Usia dalam tahun
  - `weight_kg` (`float`): Berat badan dalam Kg
  - `height_cm` (`float`): Tinggi badan dalam Cm

  *Contoh Payload:*
  ```json
  {
    "family_members": [
      {
        "name": "Arigato Simarmata",
        "gender": "Pria",
        "age": 28,
        "weight_kg": 72.5,
        "height_cm": 178.0
      },
      {
        "name": "Adik Kecil",
        "gender": "Wanita",
        "age": 7,
        "weight_kg": 22.0,
        "height_cm": 115.0
      }
    ],
    "fridge_available_ingredients": ["Ayam", "Bayam", "Telur"]
  }
  ```

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "generated_at": "2026-05-31T03:20:26Z",
    "recommended_recipes": [
      {
        "id": 1,
        "title": "Sup Ayam Bayam Sehat",
        "category": "Makan Siang",
        "duration_minutes": 30,
        "difficulty": "Mudah",
        "macros": {
          "calories": 240,
          "protein_g": 25.5,
          "carbs_g": 12.0,
          "fiber_g": 3.2
        },
        "nutrition_tag": "High Protein & Diet Fiber",
        "ingredients_list": [
          "200g Dada Ayam",
          "1 ikat Bayam segar",
          "1 butir Telur rebus",
          "2 siung Bawang putih",
          "Garam dan Merica secukupnya"
        ],
        "instructions": [
          "Rebus dada ayam hingga empuk, lalu suwir.",
          "Tumis bawang putih lalu masukkan ke dalam air kaldu rebusan.",
          "Masukkan bayam segar dan masak selama 3 menit.",
          "Sajikan hangat bersama telur rebus suwir di atasnya."
        ],
        "rating": 4.8,
        "image_res_url": "https://images.unsplash.com/photo-1547592180-85f173990554"
      }
    ]
  }
  ```

---

### 📝 D. Sinkronisasi Daftar Belanja Belanja (Shopping List Routes)

Mengimplementasikan sinkronisasi luring (offline-first sync) melintasi multi-device secara realtime.

#### 1. Sinkronisasi Unggah-Unduh Daftar Belanja (`PUT /api/v1/shopping-list/sync`)
🔑 **Membutuhkan Header Authorization**

Mengirimkan item belanja lokal terbaru untuk digabungkan (merge) ke basis data cloud terpusat. Server akan mensinkronkan data dan mengembalikan status termutakhir.

- **Payload Request (Body - JSON):**
  | Nama Kolom | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `family_id` | `string` | Ya | ID unik dari kelompok keluarga |
  | `client_timestamp` | `string` | Tidak | Waktu sinkronisasi lokal klien |
  | `items` | `array` | Ya | Daftar list item belanja saat ini di HP klien |

  *Struktur Objek di `items`:*
  - `name` (`string`): Nama bahan makanan (contoh: `"Susu UHT"`)
  - `quantity` (`string`): Jumlah takaran pembelian (contoh: `"2 Kotak"`, `"500 Gram"`)
  - `nutrition_tag` (`string`): Tag asupan dominan (contoh: `"Protein"`, `"Vitamin C"`, `"Fiber"`)
  - `protein_g` (`float`): Kandungan protein
  - `carbs_g` (`float`): Kandungan karbohidrat
  - `fiber_g` (`float`): Kandungan serat
  - `calories` (`int`): Estimasi kalori total
  - `is_checked` (`boolean`): Status sudah dicoret/dibeli (`true`/`false`)
  - `is_added_from_tip` (`boolean`): Ditambahkan melalui rekomendasi resep pintar (`true`/`false`)

  *Contoh Payload:*
  ```json
  {
    "family_id": "fam-simarmata-9988",
    "client_timestamp": "2026-05-31T12:00:00Z",
    "items": [
      {
        "name": "Bayam Sayur",
        "quantity": "2 Ikat",
        "nutrition_tag": "Fiber",
        "protein_g": 2.2,
        "carbs_g": 3.6,
        "fiber_g": 2.4,
        "calories": 23,
        "is_checked": false,
        "is_added_from_tip": true
      },
      {
        "name": "Dada Ayam Fillet",
        "quantity": "1 Kg",
        "nutrition_tag": "Protein",
        "protein_g": 310.0,
        "carbs_g": 0.0,
        "fiber_g": 0.0,
        "calories": 1650,
        "is_checked": true,
        "is_added_from_tip": false
      }
    ]
  }
  ```

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Daftar belanja keluarga berhasil tersimpan di awan secara sinkron.",
    "last_sync_server_time": "2026-05-31T03:20:26Z",
    "action_taken": "merged",
    "current_shopping_items_count": 2
  }
  ```

- **Respons Gagal (400 Bad Request):**
  ```json
  {
    "status": "error",
    "error_code": "MISSING_FAMILY_ID",
    "message": "Kolom family_id wajib disertakan untuk sinkronisasi."
  }
  ```

#### 2. Dapatkan Daftar Belanja Aktif (`GET /api/v1/shopping-list/list`)
🔑 **Membutuhkan Header Authorization**

Mendownload daftar belanja aktif saat ini untuk seluruh anggota kelompok keluarga berdasarkan `family_id`.

- **Parameter Query (Query Params):**
  - `family_id` (Wajib, `string`): ID unik kelompok keluarga Anda.

- **Format Request:**
  `GET /api/v1/shopping-list/list?family_id=fam-simarmata-9988`

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 142,
        "family_id": "fam-simarmata-9988",
        "name": "Bayam Sayur",
        "quantity": "2 Ikat",
        "nutrition_tag": "Fiber",
        "protein_g": 2.2,
        "carbs_g": 3.6,
        "fiber_g": 2.4,
        "calories": 23,
        "is_checked": false,
        "is_added_from_tip": true
      },
      {
        "id": 143,
        "family_id": "fam-simarmata-9988",
        "name": "Dada Ayam Fillet",
        "quantity": "1 Kg",
        "nutrition_tag": "Protein",
        "protein_g": 310,
        "carbs_g": 0,
        "fiber_g": 0,
        "calories": 1650,
        "is_checked": true,
        "is_added_from_tip": false
      }
    ]
  }
  ```

- **Respons Gagal (400 Bad Request):**
  ```json
  {
    "status": "error",
    "error_code": "MISSING_FAMILY_ID",
    "message": "Parameter kueri family_id wajib disertakan."
  }
  ```

---

### 👤 E. Manajemen Profil Anggota Keluarga (Family Members Routes - Tanpa Auth)

Layanan utilitas untuk mendaftarkan, menampilkan, dan menghapus profil anggota keluarga untuk perhitungan gizi. Semua payload request mutatif diaudit dalam log runtime server secara aman (melakukan hashing otomatis jika mendeteksi field bermuatan kredensial sensitif).

#### 1. Dapatkan Semua Anggota Keluarga (`GET /api/v1/family-members`)

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 1,
        "name": "Bu Dewi",
        "gender": "Wanita",
        "age": 35,
        "weight_kg": 55,
        "height_cm": 160,
        "photo_url": ""
      },
      {
        "id": 2,
        "name": "Adik Rani",
        "gender": "Wanita",
        "age": 6,
        "weight_kg": 18,
        "height_cm": 110,
        "photo_url": ""
      }
    ]
  }
  ```

#### 2. Tambah Anggota Keluarga Baru (`POST /api/v1/family-members`)

- **Payload Request (Body - JSON):**
  | Nama Kolom | Tipe Data | Wajib | Keterangan |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | Ya | Nama lengkap/panggilan anggota keluarga |
  | `gender` | `string` | Ya | Pilihan gender wajib: `"Pria"` atau `"Wanita"` |
  | `age` | `int` | Ya | Usia dalam satuan tahun (rentang valid: 1-120) |
  | `weight_kg` | `float` | Ya | Angka berat badan dalam kg (harus > 0) |
  | `height_cm` | `float` | Ya | Angka tinggi badan dalam cm (harus > 0) |

  *Contoh Payload:*
  ```json
  {
    "name": "Arigato Simarmata",
    "gender": "Pria",
    "age": 28,
    "weight_kg": 72.5,
    "height_cm": 178.0
  }
  ```

- **Respons Sukses (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "id": 3,
      "name": "Arigato Simarmata",
      "gender": "Pria",
      "age": 28,
      "weight_kg": 72.5,
      "height_cm": 178.0,
      "photo_url": ""
    }
  }
  ```

- **Respons Gagal (400 Bad Request):**
  ```json
  {
    "status": "error",
    "error_code": "REGISTRATION_FAILED",
    "message": "usia anggota keluarga tidak valid (harus di antara 1 dan 120)"
  }
  ```

#### 3. Hapus Anggota Keluarga (`DELETE /api/v1/family-members/:id`)

- **Parameter Rute (URL Param):**
  - `:id` (Wajib, `uint`): ID integer unik dari anggota keluarga yang ingin dihapus.

- **Format Request:**
  `DELETE /api/v1/family-members/3`

- **Respons Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "data": 3,
    "message": "Profil anggota keluarga berhasil dihapus."
  }
  ```

- **Respons Gagal (404 Not Found):**
  ```json
  {
    "status": "error",
    "error_code": "DELETE_FAILED",
    "message": "anggota keluarga dengan ID 3 tidak ditemukan"
  }
  ```

---

## 💡 4. Panduan & Tips Integrasi Front-End

1. **Penyimpanan Token Lokal:**
   Selalu simpan `access_token` dan `refresh_token` di dalam `localStorage` atau `Secure Storage` kustom di sisi client setelah proses masuk via `/api/v1/auth/google` berhasil.

2. **Interceptor Kadaluwarsa (401 Handler):**
   Gunakan HTTP interceptor (baik Axios maupun fetch wrapper kustom) untuk menangkap status `401 Unauthorized`. Bila ini terjadi:
   - Ambil `refresh_token` dari storage.
   - Panggil `/api/v1/auth/refresh` secara otomatis di latar belakang.
   - Perbarui header token di client dan coba jalankan kembali request yang sempat gagal tadi.
   - Jika refresh token juga kedaluwarsa, arahkan pengguna kembali ke layar Google Login utama.

3. **Indikator Loading & Sinkronisasi:**
   Untuk modul `/api/v1/shopping-list/sync`, Anda disarankan melakukan sinkronisasi otomatis pasca:
   - Pengguna keluar dari halaman daftar belanja.
   - Setiap kali item dicoret (`is_checked` diganti) dengan mekanisme debounce (misal 1 detik) agar tidak membebani trafik jaringan.

---
*Dokumentasi ini diproduksi oleh AI Studio dengan standard arsitektur Clean & SOLID Backend Service Engineering.*
