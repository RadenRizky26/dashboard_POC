"use client";
import React, { useState, useEffect } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend } from "recharts";
import { AlertTriangle, Activity, Zap, Thermometer, Gauge, ShieldAlert, Settings2, Sun, Moon, Wifi, FlaskConical, Download, SlidersHorizontal, ClipboardList, Power, WifiOff } from "lucide-react";

// --- Types ---
interface ProcessData { time: string; temperature: number; dimmer: number; rpm: number; ph: number; setPointTemp?: string; setPointRpm?: number; }
interface AlarmLog { id: string; time: string; type: "WARNING" | "INFO" | "CRITICAL" | "SUCCESS"; message: string; }
interface BatchHistory { id: string; data: ProcessData[]; }
interface FirebaseData { slave: { suhu: number; heaterPower: number; ph: number; }; master: { rpm: number; motorPower: number; }; }



export default function FuzzyPIDDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [displayActive, setDisplayActive] = useState(false); // Dashboard display state (not hardware control)
  const [isOnline, setIsOnline] = useState(true);
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  
  const [targetTempMin, setTargetTempMin] = useState<number>(38);
  const [targetTempMax, setTargetTempMax] = useState<number>(42);
  const [targetRpm, setTargetRpm] = useState<number>(120); 

  const [batchId, setBatchId] = useState<string>("PRD-Kopi-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "1", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Dashboard siap. Klik START DISPLAY untuk mulai merekam data real-time dari sistem yang sedang berjalan." } as AlarmLog,
  ]);

  const [metrics, setMetrics] = useState({ temp: 28.5, dimmer: 0, rpm: 0, ph: 7.0 });
  const [realTimeData, setRealTimeData] = useState<FirebaseData | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch data from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/index');
        const result = await response.json();
        
        if (result.status === "success") {
          setRealTimeData(result.data);
          setApiStatus("connected");
          setIsOnline(true);
        } else {
          setApiStatus("error");
          console.error("API Error:", result.message);
        }
      } catch (error) {
        setApiStatus("disconnected");
        setIsOnline(false);
        console.error("Failed to fetch data:", error);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 2 seconds
    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleDisplayToggle = () => {
    setDisplayActive(!displayActive);
    if (!displayActive) {
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Dashboard mulai menampilkan data real-time dari sistem yang sedang berjalan.` } as AlarmLog, ...prev].slice(0, 50));
    } else {
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Dashboard berhenti merekam data. Sistem hardware tetap berjalan normal." } as AlarmLog, ...prev].slice(0, 50));
    }
  };

  const startNewBatch = () => {
    if (trendData.length > 0) setPastBatches(prev => [{ id: batchId, data: [...trendData] }, ...prev]);
    const newId = `PRD-Kopi-${Math.floor(Math.random() * 1000)}`;
    setBatchId(newId);
    setTrendData([]); 
    setViewingBatchId("current"); 
    setDisplayActive(false);
    setMetrics({ temp: 28.5, dimmer: 0, rpm: 0, ph: 7.0 });
    setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Batch baru dimulai: ${newId}.` } as AlarmLog, ...prev].slice(0, 50));
  };

  const exportThermalCSV = () => {
    const dataToExport = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];
    if (dataToExport.length === 0) return alert("Tidak ada data untuk di-export.");
    const headers = "Suhu(C);Set Point Suhu;PWM Heater;Waktu\n";
    const csvData = dataToExport.map(row => `${row.temperature.toFixed(2).replace('.', ',')};${row.setPointTemp || `${targetTempMin}-${targetTempMax}`};${row.dimmer.toFixed(0)};${row.time}`).join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Log_Thermal_${viewingBatchId === "current" ? batchId : viewingBatchId}.csv`;
    a.click();
  };

  const exportMotorCSV = () => {
    const dataToExport = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];
    if (dataToExport.length === 0) return alert("Tidak ada data untuk di-export.");
    const headers = "RPM Aktual;Set Point RPM;Waktu\n";
    const csvData = dataToExport.map(row => `${row.rpm.toFixed(0)};${row.setPointRpm || targetRpm};${row.time}`).join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Log_Motor_${viewingBatchId === "current" ? batchId : viewingBatchId}.csv`;
    a.click();
  };

  // ==========================================
  // HANYA MENGAMBIL DAN MENAMPILKAN DATA DARI BACKEND
  // DASHBOARD TIDAK MENGONTROL HARDWARE - HANYA MONITORING
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      // HANYA GUNAKAN DATA DARI BACKEND PYTHON (FIREBASE)
      if (realTimeData && apiStatus === "connected") {
        const newMetrics = {
          temp: realTimeData.slave.suhu,
          dimmer: realTimeData.slave.heaterPower,
          rpm: realTimeData.master.rpm,
          ph: realTimeData.slave.ph
        };

        // Update metrics dengan data dari backend (selalu update, tidak peduli displayActive)
        setMetrics(newMetrics);

        // Tambahkan ke trend data untuk grafik (hanya saat displayActive = true)
        if (displayActive) {
          setTrendData(prevTrend => {
            const newDataPoint = {
              time: nowStr,
              temperature: newMetrics.temp,
              dimmer: newMetrics.dimmer,
              rpm: newMetrics.rpm,
              ph: newMetrics.ph,
              setPointTemp: `${targetTempMin}-${targetTempMax}`,
              setPointRpm: targetRpm
            };
            
            // Batasi data trend maksimal 100 titik untuk performa
            const updatedTrend = [...prevTrend, newDataPoint];
            return updatedTrend.length > 100 ? updatedTrend.slice(-100) : updatedTrend;
          });

          // Logging periodik
          if (Math.random() > 0.95) {
            setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "INFO", message: `Data Update: Suhu ${newMetrics.temp.toFixed(1)}°C | PWM ${newMetrics.dimmer.toFixed(0)}% | RPM ${newMetrics.rpm.toFixed(0)} | PH ${newMetrics.ph.toFixed(2)}` } as AlarmLog, ...a].slice(0, 50));
          }
        }

        // Check critical temperature (warning saja, tidak mengubah data)
        if (newMetrics.temp >= 50 && displayActive) {
          setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "CRITICAL", message: `PERINGATAN: Suhu Kritis (${newMetrics.temp.toFixed(1)}°C)!` } as AlarmLog, ...a].slice(0, 50));
        }
      } else {
        // Jika API tidak tersedia, tampilkan pesan
        if (displayActive) {
          setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "WARNING", message: "Backend tidak terhubung. Menunggu koneksi..." } as AlarmLog, ...a].slice(0, 50));
        }
      }

    }, 1500);

    return () => clearInterval(interval);
  }, [displayActive, targetTempMin, targetTempMax, targetRpm, realTimeData, apiStatus]);

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0", axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)", tooltipBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", tooltipText: isDarkMode ? "#fff" : "#0f172a",
  };

  const displayTableData = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-[#0a0f1c] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0a0f1c] dark:to-[#050810] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-500 selection:bg-emerald-500/30 pb-10">
        
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/60 backdrop-blur-2xl border-b border-slate-200/50 dark:border-white/10 px-8 py-4 flex justify-between items-center shadow-lg shadow-slate-200/50 dark:shadow-emerald-500/5 transition-all duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-2.5 rounded-2xl shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-400/30 dark:ring-emerald-500/40 animate-pulse-slow">
              <Activity size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 tracking-tight">
                DASHBOARD <span className="font-light text-slate-400 dark:text-slate-500">Fuzzy-PID</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-600 font-medium tracking-wide">Real-time Industrial Control System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* API Connection Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md transition-all duration-300 ${
              apiStatus === "connected" 
                ? "bg-emerald-50/80 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30" 
                : apiStatus === "error"
                ? "bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-500/30"
                : "bg-rose-50/80 dark:bg-rose-500/10 ring-1 ring-rose-500/30"
            }`}>
              {apiStatus === "connected" ? (
                <>
                  <Wifi size={16} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Firebase Connected</span>
                </>
              ) : apiStatus === "error" ? (
                <>
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">API Error</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-rose-600 dark:text-rose-400" />
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Disconnected</span>
                </>
              )}
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-600 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 ring-1 ring-slate-300/50 dark:ring-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200/60 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Advanced <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500">HMI Dashboard</span></h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">Monitoring Real-time Data dari Sistem Fuzzy Logic & Analog PID (Display Only - Tidak Mengontrol Hardware).</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-800/50 p-3 rounded-2xl ring-1 ring-slate-200/80 dark:ring-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
                <div className="px-2 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">Active Batch ID</span>
                  <span className="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 text-sm">{batchId}</span>
                </div>
                <div className="flex space-x-1 border-l border-slate-300 dark:border-white/10 pl-2">
                    <button onClick={startNewBatch} disabled={displayActive} className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-2 rounded-lg hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 whitespace-nowrap">
                        + Tambah
                    </button>
                    <button onClick={() => {
                        const newId = prompt("Masukkan ID Batch Baru:", batchId);
                        if (newId && newId.trim() !== "") setBatchId(newId.trim());
                    }} disabled={displayActive} className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-all duration-300 whitespace-nowrap">
                        ✎ Ganti
                    </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200/60 dark:border-slate-800">
            <button onClick={() => setActiveTab("control")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><SlidersHorizontal size={18} /> Control Panel</button>
            <button onClick={() => setActiveTab("logs")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}><ClipboardList size={18} /> Data & Logs</button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* Panel Input Angka & Start (MENGGUNAKAN RENTANG) */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 bg-gradient-to-br from-white via-white to-slate-50/50 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-slate-300/30 dark:shadow-emerald-500/5">
                
                <div className="flex items-center gap-4 bg-gradient-to-br from-orange-50/80 to-red-50/50 dark:from-orange-500/10 dark:to-red-500/5 p-4 pl-5 pr-6 rounded-2xl ring-1 ring-orange-200/80 dark:ring-orange-500/20 flex-1 backdrop-blur-sm shadow-lg shadow-orange-100/50 dark:shadow-none">
                  <Thermometer size={22} className="text-orange-500 dark:text-orange-400" strokeWidth={2.5} />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-orange-600/80 dark:text-orange-400/80 font-bold">Rentang Suhu (°C)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={targetTempMin} onChange={(e) => setTargetTempMin(Number(e.target.value))} disabled={displayActive} className="w-16 bg-white/60 dark:bg-slate-800/60 border-b-2 border-orange-300 dark:border-orange-500/50 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50 focus:border-orange-500 transition-colors rounded-t-lg px-1" />
                      <span className="text-orange-400 dark:text-orange-500 font-bold text-lg">-</span>
                      <input type="number" value={targetTempMax} onChange={(e) => setTargetTempMax(Number(e.target.value))} disabled={displayActive} className="w-16 bg-white/60 dark:bg-slate-800/60 border-b-2 border-orange-300 dark:border-orange-500/50 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50 focus:border-orange-500 transition-colors rounded-t-lg px-1" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-500/10 dark:to-indigo-500/5 p-4 pl-5 pr-6 rounded-2xl ring-1 ring-purple-200/80 dark:ring-purple-500/20 flex-1 backdrop-blur-sm shadow-lg shadow-purple-100/50 dark:shadow-none">
                  <Settings2 size={22} className="text-purple-500 dark:text-purple-400" strokeWidth={2.5} />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-purple-600/80 dark:text-purple-400/80 font-bold">Setpoint Motor (RPM)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={targetRpm} onChange={(e) => setTargetRpm(Number(e.target.value))} disabled={displayActive} className="w-24 bg-white/60 dark:bg-slate-800/60 border-b-2 border-purple-300 dark:border-purple-500/50 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50 focus:border-purple-500 transition-colors rounded-t-lg px-1" />
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleDisplayToggle}
                  className={`px-10 py-5 rounded-2xl font-black tracking-widest flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 shadow-2xl ${
                    !displayActive
                      ? "bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-emerald-500/40 hover:from-emerald-400 hover:via-emerald-500 hover:to-teal-500" 
                      : "bg-gradient-to-r from-rose-100 to-rose-200 dark:from-rose-500/20 dark:to-rose-600/20 text-rose-600 dark:text-rose-400 hover:from-rose-600 hover:to-rose-700 hover:text-white ring-2 ring-rose-500/50"
                  }`}
                >
                  <Power size={24} /> {!displayActive ? "START DISPLAY" : "STOP DISPLAY"}
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GradientCard title="Suhu Aktual (PV)" value={metrics.temp.toFixed(1)} unit="°C" icon={<Thermometer size={24} />} color="from-orange-400 via-orange-500 to-orange-600 dark:from-orange-500 dark:to-red-600" alert={metrics.temp > targetTempMax + 5} />
                <GradientCard title="PWM Heater" value={metrics.dimmer.toFixed(0)} unit="%" icon={<Zap size={24} />} color="from-yellow-400 via-amber-500 to-amber-600 dark:from-yellow-500 dark:to-orange-600" />
                <GradientCard title="Kecepatan (PV)" value={metrics.rpm.toFixed(0)} unit="RPM" icon={<Gauge size={24} />} color="from-purple-500 via-purple-600 to-purple-700 dark:from-indigo-500 dark:to-purple-600" alert={metrics.rpm > targetRpm + 20} />
                <GradientCard title="PH Aktual" value={metrics.ph.toFixed(2)} unit="pH" icon={<FlaskConical size={24} />} color="from-cyan-400 via-teal-500 to-emerald-600 dark:from-cyan-500 dark:to-emerald-600" alert={metrics.ph < 6.5 || metrics.ph > 8.5} />
              </div>

              {/* GRID GRAFIK (SPLIT) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* GRAFIK 1: THERMAL (FUZZY LOGIC) */}
                <div className="bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-orange-900/10 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-slate-300/30 dark:shadow-orange-500/5 hover:shadow-orange-200/40 dark:hover:shadow-orange-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-lg shadow-orange-500/30">
                        <Thermometer size={18} className="text-white" />
                      </div>
                      Thermal Control (Fuzzy Logic)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Monitoring intervensi AC Dimmer menjaga suhu di dalam kotak target.</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.4} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorDimmer" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} opacity={0.5} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis yAxisId="left" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={[25, 50]} />
                        <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={10} tickLine={false} axisLine={false} dx={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, backdropFilter: "blur(10px)", border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "12px", color: chartColors.tooltipText, fontSize: "12px" }} />
                        <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                        
                        <ReferenceArea yAxisId="left" y1={targetTempMin} y2={targetTempMax} fill="#f97316" fillOpacity={0.15} />
                        <ReferenceLine yAxisId="left" y={targetTempMax} stroke="#ea580c" strokeWidth={2} strokeDasharray="4 4" opacity={1} label={{ position: "insideTopLeft", value: "MAX", fill: "#ea580c", fontSize: 10, fontWeight: "bold" }} />
                        <ReferenceLine yAxisId="left" y={targetTempMin} stroke="#ea580c" strokeWidth={2} strokeDasharray="4 4" opacity={1} label={{ position: "insideBottomLeft", value: "MIN", fill: "#ea580c", fontSize: 10, fontWeight: "bold" }} />
                        
                        <Area yAxisId="left" type="monotone" dataKey="temperature" name="Suhu (PV)" stroke="#f97316" strokeWidth={3} fill="url(#colorTemp)" isAnimationActive={false} />
                        <Area yAxisId="right" type="monotone" dataKey="dimmer" name="PWM Heater" stroke="#ef4444" strokeWidth={2} fill="url(#colorDimmer)" isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAFIK 2: MOTOR (ANALOG PID) */}
                <div className="bg-gradient-to-br from-white via-white to-purple-50/30 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-purple-900/10 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-slate-300/30 dark:shadow-purple-500/5 hover:shadow-purple-200/40 dark:hover:shadow-purple-500/10 transition-all duration-500">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg shadow-purple-500/30">
                        <Gauge size={18} className="text-white" />
                      </div>
                      Motor Speed (Analog PID)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Kurva osilasi (Damped Sine Wave) menuju zona rata-rata RPM.</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorRpm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} opacity={0.5} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#a855f7" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={[0, 'dataMax + 50']} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, backdropFilter: "blur(10px)", border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "12px", color: chartColors.tooltipText, fontSize: "12px" }} />
                        <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                        
                        <ReferenceLine y={targetRpm} stroke="#9333ea" strokeWidth={2} strokeDasharray="4 4" opacity={1} label={{ position: "insideTopLeft", value: "SETPOINT", fill: "#9333ea", fontSize: 10, fontWeight: "bold" }} />
                        
                        <Line type="monotone" dataKey="rpm" name="RPM (PV)" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DATA & LOGS */}
          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
              
              <div className="flex flex-col gap-6">
                
                {/* Tabel 1: Thermal Control */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Thermometer size={20} className="text-orange-500" /> Log Thermal Control</h3>
                    <div className="flex gap-2 items-center">
                      <select value={viewingBatchId} onChange={(e) => setViewingBatchId(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 outline-none text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                        <option value="current">🟢 Current ({batchId})</option>
                        {pastBatches.map(b => (<option key={b.id} value={b.id}>📁 History ({b.id})</option>))}
                      </select>
                      <button onClick={exportThermalCSV} className="text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-100 transition font-bold text-emerald-600"><Download size={14} /> CSV Thermal</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl relative">
                    <table className="w-full text-left border-collapse min-w-[340px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
                          <th className="p-3 font-semibold">Suhu (°C)</th>
                          <th className="p-3 font-semibold">Set Point</th>
                          <th className="p-3 font-semibold">PWM Heater</th>
                          <th className="p-3 font-semibold">Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...displayTableData].reverse().map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm">
                            <td className="p-3">{row.temperature.toFixed(2)}</td>
                            <td className="p-3 font-mono text-xs">{row.setPointTemp || `${targetTempMin}-${targetTempMax}`}</td>
                            <td className="p-3">{row.dimmer.toFixed(0)}</td>
                            <td className="p-3 font-mono text-xs">{row.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabel 2: Motor Control */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Gauge size={20} className="text-purple-500" /> Log Motor Control</h3>
                    <button onClick={exportMotorCSV} className="text-xs flex items-center gap-1 bg-purple-50 dark:bg-purple-500/20 px-4 py-2 rounded-xl hover:bg-purple-100 transition font-bold text-purple-600"><Download size={14} /> CSV Motor</button>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl relative">
                    <table className="w-full text-left border-collapse min-w-[280px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
                          <th className="p-3 font-semibold">RPM</th>
                          <th className="p-3 font-semibold">Set Point</th>
                          <th className="p-3 font-semibold">Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...displayTableData].reverse().map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm">
                            <td className="p-3">{row.rpm.toFixed(0)}</td>
                            <td className="p-3 font-mono text-xs">{row.setPointRpm || targetRpm}</td>
                            <td className="p-3 font-mono text-xs">{row.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-full lg:h-[824px]">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><ShieldAlert size={20} className="text-emerald-500" /> System & Fuzzy Logs</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Log intervensi kontrol & Diagram Alir K3.</p>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.map((alarm, index) => (
                    <div key={`${alarm.id}-${index}`} className={`p-4 rounded-2xl ring-1 ${alarm.type === "CRITICAL" ? "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/30" : alarm.type === "SUCCESS" ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30" : "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-amber-600" : alarm.type === "CRITICAL" ? "text-rose-600" : alarm.type === "SUCCESS" ? "text-emerald-600" : "text-blue-600"}`}>{alarm.type}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{alarm.time}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${alarm.type === "CRITICAL" ? "text-rose-700 font-medium" : alarm.type === "SUCCESS" ? "text-emerald-700 font-medium dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>{alarm.message}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function GradientCard({ title, value, unit, icon, color, alert = false }: any) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-white via-white to-slate-50/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/40 backdrop-blur-md p-6 rounded-3xl border transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] group ${alert ? "border-rose-400 dark:border-rose-500/50 shadow-2xl shadow-rose-500/20 dark:shadow-rose-500/30 ring-2 ring-rose-400/30" : "border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-300/30 dark:shadow-none hover:shadow-2xl hover:shadow-slate-400/30 dark:hover:shadow-emerald-500/10"}`}>
      <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${color} opacity-10 dark:opacity-20 rounded-full blur-3xl group-hover:opacity-20 dark:group-hover:opacity-30 group-hover:scale-110 transition-all duration-700`}></div>
      <div className="relative z-10 flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>{icon}</div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <h3 className={`text-4xl font-extrabold tracking-tight transition-all duration-300 ${alert ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-slate-800 dark:text-white group-hover:scale-105"}`}>{value}</h3>
        <span className="text-lg font-medium text-slate-400 dark:text-slate-500">{unit}</span>
      </div>
      {alert && (
        <div className="absolute top-3 left-3 z-20">
          <div className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            <AlertTriangle size={12} />
            ALERT
          </div>
        </div>
      )}
    </div>
  );
}