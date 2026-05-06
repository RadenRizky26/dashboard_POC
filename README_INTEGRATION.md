# Dashboard POC - Integrasi Frontend & Backend

## 📊 Arsitektur Data Flow

```
Firebase Realtime DB
        ↓
Backend Python (Flask API)
   /api/index endpoint
        ↓
Frontend (Next.js)
   Polling setiap 2 detik
        ↓
Grafik Real-time (Recharts)
```

## 🔗 Integrasi Backend Python

### Backend API Structure
**Endpoint:** `GET /api/index`

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "slave": {
      "suhu": 35.5,
      "heaterPower": 45.2
    },
    "master": {
      "rpm": 120.0,
      "motorPower": 75.0
    }
  }
}
```

### Frontend Implementation

#### 1. Data Fetching (Real-time Polling)
- Polling interval: **2 detik**
- Menggunakan `useEffect` hook untuk fetch data dari `/api/index`
- Status koneksi: `connected`, `error`, atau `disconnected`

#### 2. Grafik Menggunakan Data Backend
**Ketika API Connected:**
- ✅ Data suhu dari `data.slave.suhu`
- ✅ Data heater power dari `data.slave.heaterPower`
- ✅ Data RPM dari `data.master.rpm`
- ✅ Data disimpan ke `trendData` array untuk visualisasi grafik
- ✅ Maksimal 50 data points untuk performa optimal

**Ketika API Disconnected:**
- ⚠️ Fallback ke mode simulasi
- ⚠️ Log menampilkan `[Simulasi]` sebagai sumber data

#### 3. Visualisasi Data
**Thermal Control Chart:**
- Line chart untuk suhu (°C)
- Area chart untuk PWM Heater (%)
- Reference area untuk target range suhu

**Motor Control Chart:**
- Line chart untuk RPM
- Reference line untuk setpoint RPM

## 🎨 UI Enhancements

### 1. API Connection Status Indicator
- 🟢 **Connected**: Hijau dengan icon Wifi + animasi pulse
- 🟡 **Error**: Kuning dengan icon AlertTriangle
- 🔴 **Disconnected**: Merah dengan icon WifiOff

### 2. Premium Design Elements
- **Glassmorphism**: `backdrop-blur-2xl` effects
- **Gradients**: Multi-color gradients untuk buttons dan cards
- **Shadows**: Layered shadows dengan color tints
- **Animations**: Smooth transitions, hover effects, pulse animations
- **Custom Scrollbar**: Styled scrollbar untuk tables

### 3. Enhanced Components
- **Navbar**: Gradient shadows, animated logo, connection status
- **Control Panel**: Colored input fields dengan focus states
- **KPI Cards**: Hover animations (scale, rotate, translate)
- **Charts**: Themed backgrounds dengan gradient overlays
- **Buttons**: Multi-color gradients dengan shadow effects

## 🚀 Cara Menjalankan

### Backend (Python Flask)
```bash
cd api
python index.py
```

### Frontend (Next.js)
```bash
npm run dev
```

Akses dashboard di: `http://localhost:3000`

## 📝 Fitur Utama

1. **Real-time Data Monitoring**
   - Data langsung dari Firebase via Python backend
   - Update setiap 2 detik
   - Visual indicator untuk status koneksi

2. **Hybrid Mode**
   - Mode Firebase: Menggunakan data real-time
   - Mode Simulasi: Fallback ketika API tidak tersedia

3. **Data Logging**
   - Historical data disimpan untuk grafik
   - Export ke CSV (Thermal & Motor)
   - Batch management system

4. **Safety Features**
   - E-Stop button
   - Critical temperature alarm (>50°C)
   - Process state management (IDLE/RUNNING/COMPLETED)

## 🔧 Konfigurasi

### Firebase Setup
File: `api/firebase-key.json` atau environment variable `FIREBASE_KEY`

Database URL: `https://bestari-c3618-default-rtdb.asia-southeast1.firebasedatabase.app/`

### Data Structure di Firebase
```
data_POC/
  ├── slave/
  │   ├── suhu: number
  │   └── heaterPower: number
  └── master/
      ├── rpm: number
      └── motorPower: number
```

## 📊 Grafik Data

- **Thermal Control**: Menampilkan suhu dan PWM heater dari backend
- **Motor Control**: Menampilkan RPM dari backend
- **Trend Data**: Maksimal 50 data points (auto-trim untuk performa)
- **Real-time Update**: Data di-refresh setiap 1.5 detik

## 🎯 Status Implementasi

- ✅ Backend API integration
- ✅ Real-time data polling
- ✅ Grafik menggunakan data backend
- ✅ Connection status indicator
- ✅ Premium UI/UX design
- ✅ Fallback simulation mode
- ✅ Data export (CSV)
- ✅ Batch management

---

**Last Updated:** 2026-05-06
**Version:** 1.0.0
