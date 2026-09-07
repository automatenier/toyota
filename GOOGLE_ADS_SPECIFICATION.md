# Panduan & Spesifikasi Kampanye Google Ads: Tunas Toyota Jabodetabek
**Konsultan:** Mathew Jordan (Senior Sales Executive • PT Tunas Ridean Tbk)  
**Landing Page:** `https://toyota.jordanengo.com` (Fallback: `https://automatenier.github.io/toyota/`)  
**WhatsApp Hotline:** `+62 889-7578-5200`

---

## 1. Arsitektur Aksi Konversi (Google Ads Conversion Actions)

Di Google Ads Dashboard, buka menu **Goals (Sasaran)** → **Conversions (Konversi)** → **Summary** → **New conversion action (Tindakan konversi baru)** → Pilih **Website**.

| Nama Aksi Konversi | Kategori Sasaran | Nilai Konversi (Value) | Metode Penghitungan (Count) | Model Atribusi | Enhanced Conversions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Toyota_Lead_Hero_Quiz` | **Submit lead form** (Kirim formulir prospek) | Beri nilai `Rp 100.000` (atau gunakan nilai sama untuk setiap konversi) | **One (Satu)** per interaksi | Data-driven (berbasis data) | **Wajib Centang** (First-party normalized phone & name) |
| `Toyota_Lead_Credit_Calculator` | **Submit lead form** (Kirim formulir prospek) | Beri nilai `Rp 50.000` | **One (Satu)** | Data-driven | Aktif |
| `Toyota_WhatsApp_Contact` | **Contact** (Kontak via WhatsApp) | Beri nilai `Rp 75.000` | **One (Satu)** | Data-driven | Aktif |
| `Toyota_Voice_AI_Engage` | **Engagement** (Secondary / Observasi) | Jangan sertakan di "Conversions" (Set sebagai Secondary) | **One (Satu)** | Last Click | Non-aktif |

### Cara Memasukkan ID & Label ke Website
Setelah Anda membuat conversion actions di atas di Google Ads, Anda akan mendapatkan **Conversion ID** (berformat `AW-XXXXXXXXXX`) dan **Conversion Label** (berupa string acak alfabet/angka).
Buka file `index.html` dan cari bagian:
```javascript
window.TOYOTA_CONFIG = {
  // ...
  tracking: {
    ga4_id: "G-XXXXXXXXXX",          // Masukkan GA4 Measurement ID Anda
    google_ads_id: "AW-123456789",   // Masukkan Google Ads Conversion ID Anda
    conversion_labels: {
      hero_quiz_lead: "aBcDeFgHiJkL",      // Label dari aksi Toyota_Lead_Hero_Quiz
      credit_calc_lead: "bCdEfGhIjKlM",    // Label dari aksi Toyota_Lead_Credit_Calculator
      whatsapp_click: "cDeFgHiJkLmN",      // Label dari aksi Toyota_WhatsApp_Contact
      voice_agent_interact: ""             // Opsional
    }
  }
};
```

---

## 2. Pengaturan Dasar Kampanye (Campaign Settings)

- **Tipe Kampanye:** Search Network Only (Non-aktifkan "Include Google search partners" dan Non-aktifkan "Google Display Network expansion" untuk menghindari pembengkakan budget pada penempatan sampah).
- **Target Lokasi:**
  - DKI Jakarta (Jakarta Pusat, Jakarta Selatan, Jakarta Barat, Jakarta Timur, Jakarta Utara)
  - Kota & Kab. Bogor
  - Kota Depok
  - Kota Tangerang, Kota Tangerang Selatan, Kab. Tangerang
  - Kota & Kab. Bekasi
  - *Location Option:* Pilih **"Presence: People in or regularly in your targeted locations"** (Bukan interest dari luar daerah).
- **Bahasa:** Indonesian (Bahasa Indonesia) & English.
- **Strategi Bidding:**
  - **Fase 1 (Hari 1 s/d 14 - Data Gathering):** `Maximize Clicks` dengan Maximum CPC limit sebesar `Rp 4.500 - Rp 6.500`. Jangan gunakan Target CPA saat konversi masih 0 karena algoritma Google akan bingung.
  - **Fase 2 (Setelah terkumpul minimal 30 konversi valid):** Beralih ke `Maximize Conversions` dengan Target CPA sebesar `Rp 65.000 - Rp 95.000`.
- **Jadwal Iklan (Ad Schedule):**
  - Senin – Minggu: `07.00 – 22.00 WIB` (Saat Mathew Jordan aktif merespon WhatsApp segera).

---

## 3. Struktur Ad Groups & Kata Kunci (Keywords)

### Ad Group 1: General Promo & Dealer Resmi Jabodetabek
**Intent:** Calon pembeli yang mencari sales/dealer resmi Toyota terpercaya di Jabodetabek.
- `"dealer resmi toyota jabodetabek"`
- `"promo toyota jakarta"`
- `"sales toyota tunas jabodetabek"`
- `"diskon mobil toyota 2026"`
- `[tunas toyota jakarta]`
- `[promo mobil toyota terbaru]`
- `"kredit mobil toyota dp murah"`

### Ad Group 2: All New Avanza & Veloz (Volume Seller)
**Intent:** Keluarga atau pembeli mobil pertama yang mencari paket DP ringan 10–15 Juta.
- `"promo toyota avanza jakarta"`
- `"kredit avanza dp murah jabodetabek"`
- `"tabel angsuran avanza 2026"`
- `"diskon toyota veloz jakarta"`
- `[dp avanza 15 juta]`
- `"kredit toyota veloz cicilan murah"`
- `[promo avanza tunas toyota]`

### Ad Group 3: All New Kijang Innova Zenix (Hybrid & Bensin)
**Intent:** Konsumen kelas menengah-atas / eksekutif yang memprioritaskan unit ready stock & diskon terbaik.
- `"promo innova zenix jakarta"`
- `"kredit innova zenix hybrid"`
- `"diskon kijang innova zenix"`
- `"innova zenix ready stock jabodetabek"`
- `[dp innova zenix tunas toyota]`
- `"tabel kredit innova zenix 2026"`

### Ad Group 4: Fortuner GR Sport & Raize Turbo
**Intent:** SUV dan Compact SUV enthusiast yang mencari skema bunga 0% atau DP minim.
- `"promo toyota fortuner bunga 0"`
- `"kredit fortuner gr sport jakarta"`
- `"diskon toyota fortuner 2026"`
- `"promo toyota raize turbo dp murah"`
- `[kredit toyota raize jakarta]`

---

## 4. Master Negative Keyword List (Wajib Diterapkan!)
Tambahkan daftar kata kunci negatif berikut di tingkat kampanye untuk mencegah biaya iklan terbuang sia-sia:

```text
bekas
second
mobkas
olx
carmudi
mobil123
seva bekas
bengkel
servis
service
ganti oli
sparepart
onderdil
ac mobil
ban
variasi
aksesoris
rental
sewa
sewa mobil
rent car
lepas kunci
driver
supir
lowongan
loker
karir
career
gaji
magang
rekrutmen
modifikasi
miniatur
diecast
wallpaper
gambar
foto
sketsa
recall
keluhan
masalah
kasus
rusak
mogok
```

---

## 5. Teks Iklan: Responsive Search Ads (RSAs)

### A. Format Iklan: General Promo & Dealer Resmi
- **Headlines (Maks. 30 karakter, pilih kombinasi terbaik):**
  1. Promo Toyota Jabodetabek
  2. Beli Toyota Data Dibantu ACC
  3. Mathew Jordan - Tunas Toyota
  4. TDP Mulai 10% & Bunga 0%
  5. Ready Stock Siap Kirim Towing
  6. Dealer Resmi PT Tunas Ridean
  7. Diskon Spesial Bulan Ini
  8. Konsultasi Kredit 24 Jam
- **Descriptions (Maks. 90 karakter):**
  1. Dapatkan harga & diskon Toyota terbaik se-Jabodetabek bersama Mathew Jordan. Data dibantu sampai ACC!
  2. Promo TDP mulai 10%, proses kilat 1x24 jam leasing resmi, gratis towing & servis berkala 3 tahun.
  3. Cek simulasi angsuran resmi Avanza, Zenix, Veloz, dan Fortuner. Konsultasi gratis via WhatsApp sekarang!
  4. Dealer resmi Tunas Toyota Hayam Wuruk. Transaksi aman, legalitas terjamin, mobil mulus ke garasi.

### B. Format Iklan: Spesifik Innova Zenix
- **Headlines:**
  1. Promo Toyota Innova Zenix
  2. Ready Stock Zenix Hybrid
  3. Cicilan Zenix Mulai 7 Jt-an
  4. Diskon Maksimal Innova Zenix
  5. Free Kaca Film V-Kool & Oli
- **Descriptions:**
  1. Unit Ready Stock Innova Zenix Gasoline & Hybrid se-Jabodetabek. Konsultasi TDP & bunga promo!
  2. Proses approval leasing cepat 1x24 jam. Dapatkan cashback jutaan & towing gratis sampai rumah.

---

## 6. Aset Iklan / Ad Extensions (Meningkatkan CTR & Quality Score)

1. **Sitelink Assets:**
   - *Sitelink 1:* **Hitung Simulasi Kredit** (URL: `https://toyota.jordanengo.com/#kalkulator-kredit`)  
     *Deskripsi:* Sesuaikan DP & tenor cicilan dengan kalkulator interaktif resmi.
   - *Sitelink 2:* **Katalog All New Avanza** (URL: `https://toyota.jordanengo.com/#katalog-mobil`)  
     *Deskripsi:* TDP mulai 15 Juta-an, bonus karpet dasar & voucher bensin.
   - *Sitelink 3:* **Innova Zenix Ready Stock** (URL: `https://toyota.jordanengo.com/#katalog-mobil`)  
     *Deskripsi:* Tersedia tipe Gasoline & Hybrid, siap kirim Jabodetabek.
   - *Sitelink 4:* **6 Keunggulan Layanan** (URL: `https://toyota.jordanengo.com/#keunggulan`)  
     *Deskripsi:* Mengapa memilih Mathew Jordan dari PT Tunas Ridean Tbk.

2. **Callout Assets:**
   - Resmi PT Tunas Ridean Tbk
   - Data Dibantu Sampai ACC
   - Proses Kilat 1x24 Jam
   - Free Towing Se-Jabodetabek
   - Ready Stock All Varian
   - Bunga Ringan Mulai 0%

3. **Structured Snippet Assets:**
   - Header: *Models (Model)*
   - Values: `Innova Zenix`, `All New Avanza`, `All New Veloz`, `Fortuner GR Sport`, `Raize Turbo`, `Yaris Cross`, `Calya`

4. **Call Asset (Ekstensi Telepon):**
   - Nomor: `+62 889-7578-5200`
   - Jadwal Aktif: `Setiap Hari 08.00 - 20.00 WIB`

---

## 7. Checklist Manual Anda di Google (Commercial Decisions)

Sesuai pembagian aman ("Agent prepares infrastructure → You approve commercial decisions"), berikut yang perlu Anda lakukan sendiri di Google Ads:

- [ ] Masuk ke [Google Ads](https://ads.google.com/) menggunakan akun Google Anda.
- [ ] Buat conversion action sesuai **Tabel 1** di atas, lalu salin `AW-ID` dan `Label` ke `window.TOYOTA_CONFIG.tracking` di `index.html`.
- [ ] Atur metode pembayaran & billing di menu Billing Google Ads.
- [ ] Buat kampanye Search baru dengan setting geolokasi Jabodetabek dan anggaran harian sesuai kemampuan (rekomendasi awal: `Rp 50.000 – Rp 150.000 / hari`).
- [ ] Copy-paste daftar negative keywords dari **Seksi 4** agar anggaran tidak terbuang.
- [ ] Copy-paste teks Responsive Search Ads dari **Seksi 5**.
- [ ] Klik **Review & Publish** kampanye ketika Anda sudah siap.
