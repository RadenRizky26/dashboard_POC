"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Zap, Thermometer, ShieldAlert, Sun, Moon, Download, AlertOctagon, SlidersHorizontal, ClipboardList, TableProperties, Power, Droplets, Leaf, ThermometerSun } from "lucide-react";

// --- Types ---
interface ProcessData { time: string; roomTemp: number; targetTemp: number; heaterTemp: number; humidity: number; ambientTemp: number; ambientHumidity: number; elapsedMins: number; }
interface AlarmLog { id: string; time: string; type: "WARNING" | "INFO" | "CRITICAL" | "SUCCESS"; message: string; }
interface BatchHistory { id: string; data: ProcessData[]; }

type ProcessState = "IDLE" | "RUNNING" | "COMPLETED";

export default function CascaraOvenDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [processState, setProcessState] = useState<ProcessState>("IDLE");
  const [isEStop, setIsEStop] = useState(false);
  
  // Setpoints Oven Cascara (Murni Waktu & Suhu)
  const [targetTempMax, setTargetTempMax] = useState<number>(55); 
  const [targetHours, setTargetHours] = useState<number>(5); 
  
  const [estimatedEndTime, setEstimatedEndTime] = useState<Date | null>(null);
  
  const [batchId, setBatchId] = useState<string>("CASCARA-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "init", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Sistem Oven Cascara Siap. Menunggu perintah..." },
  ]);

  const [metrics, setMetrics] = useState({ 
    roomTemp: 28.5, 
    heaterTemp: 28.5, 
    targetTemp: 28.5,
    humidity: 65, 
    ambientTemp: 27.2,
    ambientHumidity: 75,
    elapsedMins: 0 
  });

  const previousTargetRef = useRef(28.5);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleEStop = () => {
    setIsEStop(!isEStop);
    if (!isEStop) {
      setProcessState("IDLE");
      setEstimatedEndTime(null);
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "CRITICAL", message: "EMERGENCY STOP! Pemanas dimatikan paksa." } as AlarmLog, ...prev].slice(0, 50));
    } else {
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "E-Stop di-reset. Sistem Standby." } as AlarmLog, ...prev].slice(0, 50));
    }
  };

  const handleStartStop = () => {
    if (processState === "IDLE" || processState === "COMPLETED") {
      setProcessState("RUNNING");
      setMetrics(prev => ({ ...prev, elapsedMins: 0 }));
      previousTargetRef.current = 35; 
      
      const endTime = new Date(Date.now() + targetHours * 60 * 60 * 1000);
      setEstimatedEndTime(endTime);

      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Sistem Aktif. Memulai pengeringan berdurasi ${targetHours} Jam.` } as AlarmLog, ...prev].slice(0, 50));
    } else {
      setProcessState("IDLE");
      setEstimatedEndTime(null);
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "WARNING", message: "Proses dihentikan manual oleh user." } as AlarmLog, ...prev].slice(0, 50));
    }
  };

  const startNewBatch = () => {
    if (trendData.length > 0) setPastBatches(prev => [{ id: batchId, data: [...trendData] }, ...prev]);
    const newId = `CASCARA-${Math.floor(Math.random() * 1000)}`;
    setBatchId(newId);
    setTrendData([]); 
    setViewingBatchId("current"); 
    setProcessState("IDLE");
    setEstimatedEndTime(null);
    setMetrics({ roomTemp: 28.5, heaterTemp: 28.5, targetTemp: 28.5, humidity: 65, ambientTemp: 27.2, ambientHumidity: 75, elapsedMins: 0 });
    setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Batch baru dimulai: ${newId}.` } as AlarmLog, ...prev].slice(0, 50));
  };

  const exportToCSV = () => {
    const dataToExport = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];
    if (dataToExport.length === 0) return alert("Tidak ada data untuk di-export.");
    const headers = "Waktu;Suhu Ruang(C);Suhu Target(C);Suhu Pemanas(C);Kelembaban Oven(%);Suhu Luar(C);Kelembaban Luar(%);Menit Berjalan\n";
    const csvData = dataToExport.map(row => `${row.time};${row.roomTemp.toFixed(1)};${row.targetTemp.toFixed(1)};${row.heaterTemp.toFixed(1)};${row.humidity.toFixed(1)};${row.ambientTemp.toFixed(1)};${row.ambientHumidity.toFixed(1)};${row.elapsedMins.toFixed(0)}`).join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Log_Cascara_${viewingBatchId === "current" ? batchId : viewingBatchId}.csv`;
    a.click();
  };

  // ==========================================
  // SIMULASI UTAMA (WAKTU SEBAGAI TRIGGER)
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        let { roomTemp, heaterTemp, humidity, ambientTemp, ambientHumidity, elapsedMins, targetTemp } = prev;
        const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const totalTargetMins = targetHours * 60;

        // Simulasi fluktuasi cuaca luar (Suhu & Kelembaban Lingkungan)
        ambientTemp = 26 + Math.sin(Date.now() / 20000) * 3 + (Math.random() * 0.2);
        ambientHumidity = 78 + Math.cos(Date.now() / 25000) * 5 + (Math.random() * 1);

        if (isEStop) {
          heaterTemp = Math.max(ambientTemp, heaterTemp - 5);
          roomTemp = Math.max(ambientTemp, roomTemp - 1);
          humidity = Math.min(ambientHumidity, humidity + 0.5);
          targetTemp = ambientTemp;
        } 
        else if (processState === "RUNNING") {
          elapsedMins += 2.5; // Percepatan simulasi

          // Logika Step Heating
          const step = Math.floor(elapsedMins / 30);
          targetTemp = Math.min(targetTempMax, 35 + (step * 5));

          if (targetTemp > previousTargetRef.current) {
            setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "INFO", message: `Suhu target dinaikkan ke ${targetTemp}°C untuk ekstraksi uap air.` } as AlarmLog, ...a].slice(0, 50));
            previousTargetRef.current = targetTemp;
          }

          if (roomTemp < targetTemp - 0.5) heaterTemp = Math.min(targetTemp + 20, heaterTemp + (Math.random() * 4 + 2)); 
          else if (roomTemp > targetTemp + 0.5) heaterTemp = Math.max(ambientTemp, heaterTemp - 3); 
          else heaterTemp = targetTemp + (Math.random() * 2); 

          const heatTransfer = (heaterTemp - roomTemp) * 0.15;
          roomTemp += heatTransfer + (Math.random() * 0.2 - 0.1);

          // Kelembaban oven menurun karena suhu panas
          const dryingFactor = (roomTemp - ambientTemp) * 0.015;
          humidity = Math.max(5, humidity - dryingFactor - (Math.random() * 0.1));

          // KONDISI BERHENTI (Murni Berdasarkan Durasi Waktu)
          if (elapsedMins >= totalTargetMins) {
            elapsedMins = totalTargetMins;
            setProcessState("COMPLETED");
            setEstimatedEndTime(null);
            setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "SUCCESS", message: `SELESAI! Waktu pengeringan ${targetHours} Jam telah terpenuhi.` } as AlarmLog, ...a].slice(0, 50));
          }
        } 
        else {
          heaterTemp = Math.max(ambientTemp, heaterTemp - 2);
          roomTemp = Math.max(ambientTemp, roomTemp - 0.5);
          targetTemp = ambientTemp;
          humidity = Math.min(ambientHumidity, humidity + 0.5);
        }

        const newMetrics = { 
          roomTemp: +(roomTemp.toFixed(2)), 
          heaterTemp: +(heaterTemp.toFixed(1)), 
          targetTemp: +(targetTemp.toFixed(1)),
          humidity: +(humidity.toFixed(1)), 
          ambientTemp: +(ambientTemp.toFixed(1)),
          ambientHumidity: +(ambientHumidity.toFixed(1)),
          elapsedMins 
        };

        if (processState === "RUNNING" || roomTemp > ambientTemp + 2) {
          setTrendData(prevTrend => [...prevTrend, { 
            time: nowStr.slice(0, 5), 
            ...newMetrics
          }]);
        }

        return newMetrics;
      });
    }, 1500); 

    return () => clearInterval(interval);
  }, [processState, isEStop, targetTempMax, targetHours]);

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0", axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)", tooltipBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", tooltipText: isDarkMode ? "#fff" : "#0f172a",
  };

  const displayTableData = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];

  // Visualisasi Kulit sekarang diprediksi dari PERSENTASE WAKTU (karena tidak ada target lembab spesifik)
  const getSkinStatus = () => {
    const progress = (metrics.elapsedMins / (targetHours * 60)) * 100;
    if (processState === "COMPLETED" || progress >= 95) return { img: "/skin_dry.svg", text: "Kering", color: "text-orange-800", desc: "Pengeringan selesai! Siap dikemas." };
    if (progress > 40) return { img: "/skin_medium.svg", text: "Setengah Kering", color: "text-amber-500", desc: "Teh mulai layu dan menciut." };
    return { img: "/skin_wet.svg", text: "Masih Basah", color: "text-blue-500", desc: "Proses pengeringan baru dimulai." };
  };
  const skinStatus = getSkinStatus();

  // FORMAT TIMER MURNI (HH:MM:SS) - Hitung Maju
  const hrs = Math.floor(metrics.elapsedMins / 60).toString().padStart(2, '0');
  const mins = Math.floor(metrics.elapsedMins % 60).toString().padStart(2, '0');
  const secs = Math.floor((metrics.elapsedMins * 60) % 60).toString().padStart(2, '0');
  const formattedTimer = `${hrs}:${mins}:${secs}`;

  const getTrafficLight = (temp: number, isRoom: boolean) => {
    const limit = targetTempMax;
    if (temp > limit + 3) return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse";
    if (isRoom && temp > metrics.targetTemp + 2) return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]";
    if (!isRoom && temp > limit) return "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]";
    return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]";
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0a0f1c] dark:to-[#050810] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-500 pb-10">
        
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm transition-colors duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-400 to-red-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <Leaf size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-slate-800 dark:text-white tracking-tight">Oven <span className="text-orange-500">Cascara</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-orange-500 ring-1 ring-slate-200 dark:ring-white/5 transition-all">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Monitoring <span className="text-orange-500">Pengeringan Teh</span></h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">Dashboard kontrol cerdas berbasis target durasi waktu & profil suhu bertahap.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/5">
                <div className="px-2 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">ID Proses</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">{batchId}</span>
                </div>
                <div className="flex space-x-1 border-l border-slate-300 dark:border-white/10 pl-2">
                    <button onClick={startNewBatch} disabled={processState === "RUNNING"} className="text-xs font-bold bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-400 disabled:opacity-50 transition-colors">+ Tambah</button>
                </div>
              </div>
              <button onClick={toggleEStop} className={`p-3 px-8 rounded-xl font-black tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isEStop ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 ring-1 ring-rose-500/50 hover:bg-rose-600 hover:text-white"}`}>
                <AlertOctagon size={20} /> {isEStop ? "RESET DARURAT" : "STOP DARURAT"}
              </button>
            </div>
          </div>

          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <ShieldAlert className="text-blue-500 w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-blue-700 dark:text-blue-400">Pemandu Sistem:</h3>
              <p className="text-blue-600 dark:text-blue-300 text-sm">
                {processState === "IDLE" ? "Mesin dalam keadaan mati. Silakan atur parameter, lalu tekan START." : 
                 processState === "RUNNING" ? `Mesin sedang bekerja mengejar target waktu ${targetHours} Jam. Estimasi mesin otomatis mati pada jam ${estimatedEndTime ? estimatedEndTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '--:--'} WIB.` :
                 "Proses pengeringan sudah selesai berdasarkan timer! Silakan buka mesin dan angkat teh cascara."}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab("control")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500"}`}><SlidersHorizontal size={18} /> Panel Utama</button>
            <button onClick={() => setActiveTab("logs")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500"}`}><ClipboardList size={18} /> Histori & Log</button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex-1">
                  <Thermometer size={20} className="text-orange-500" />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Batas Suhu Oven (°C)</span>
                    <input type="number" value={targetTempMax} onChange={(e) => setTargetTempMax(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-24 mt-1 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-xl font-bold text-slate-800 dark:text-white disabled:opacity-50" />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex-1">
                  <Clock size={20} className="text-purple-500" />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Durasi Timer (Jam)</span>
                    <input type="number" value={targetHours} onChange={(e) => setTargetHours(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-24 mt-1 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-xl font-bold text-slate-800 dark:text-white disabled:opacity-50" />
                  </div>
                </div>
                
                <button 
                  onClick={handleStartStop} disabled={isEStop}
                  className={`px-10 py-5 rounded-2xl font-black tracking-widest flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 ${
                    processState === "IDLE" || processState === "COMPLETED"
                      ? "bg-orange-500 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:bg-orange-400" 
                      : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white ring-1 ring-rose-500/50"
                  }`}
                >
                  <Power size={24} /> {processState === "IDLE" || processState === "COMPLETED" ? "MULAI PENGERINGAN" : "STOP PENGERINGAN"}
                </button>
              </div>

              {/* GRID 1: Data Mesin Oven */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GradientCard title="Suhu Ruang Oven" value={metrics.roomTemp.toFixed(1)} unit="°C" icon={<Thermometer size={24} />} color="from-orange-400 to-red-500" statusColor={getTrafficLight(metrics.roomTemp, true)} />
                <GradientCard title="Suhu Pemanas" value={metrics.heaterTemp.toFixed(1)} unit="°C" icon={<Zap size={24} />} color="from-yellow-400 to-amber-600" statusColor={getTrafficLight(metrics.heaterTemp, false)} />
                <GradientCard title="Kelembaban Ruang Udara Oven" value={metrics.humidity.toFixed(1)} unit="%" icon={<Droplets size={24} />} color="from-blue-400 to-cyan-500" />
              </div>

              {/* GRID 2: Data Lingkungan & Waktu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GradientCard title="Waktu Berjalan" value={formattedTimer} unit={`/ ${targetHours} Jam`} icon={<Clock size={24} />} color="from-purple-500 to-indigo-500" isTimer={true} alert={processState === "COMPLETED"} />
                <GradientCard title="Suhu Luar (Lingkungan)" value={metrics.ambientTemp.toFixed(1)} unit="°C" icon={<ThermometerSun size={24} />} color="from-slate-400 to-slate-500" />
                <GradientCard title="Kelembaban Luar (Lingkungan)" value={metrics.ambientHumidity.toFixed(1)} unit="%" icon={<Droplets size={24} />} color="from-slate-400 to-slate-500" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Kurva Profil Suhu Bertingkat</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Suhu oven mengejar suhu target yang dinaikkan perlahan agar nutrisi teh terjaga.</p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={[20, 'dataMax + 10']} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: "12px", border: "none", color: chartColors.tooltipText }} />
                        <Line type="stepAfter" dataKey="targetTemp" name="Target Suhu (°C)" stroke="#eab308" strokeWidth={3} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                        <Area type="monotone" dataKey="roomTemp" name="Suhu Ruang Oven (°C)" stroke="#f97316" strokeWidth={3} fill="#f97316" fillOpacity={0.1} isAnimationActive={false} />
                        <Line type="monotone" dataKey="ambientTemp" name="Suhu Luar (°C)" stroke="#64748b" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Estimasi Kulit Cascara</h3>
                  <div className="relative w-40 h-40 mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center ring-4 ring-slate-100 dark:ring-slate-800">
                    <Image src={skinStatus.img} alt="Kondisi Teh" width={100} height={100} className="object-contain drop-shadow-xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <span className="absolute -bottom-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-200 dark:border-slate-700">Visualisasi</span>
                  </div>
                  <h2 className={`text-2xl font-black mb-2 ${skinStatus.color}`}>{skinStatus.text}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm px-4">{skinStatus.desc}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col h-[600px] shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><TableProperties size={20} className="text-orange-500" /> Catatan Sensor</h3>
                  <div className="flex gap-2 items-center">
                    <button onClick={exportToCSV} className="text-xs flex items-center gap-1 bg-orange-50 dark:bg-orange-500/20 px-4 py-2 rounded-xl hover:bg-orange-100 transition font-bold text-orange-600"><Download size={14} /> Unduh CSV</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        <th className="p-4 font-semibold">Waktu</th>
                        <th className="p-4 font-semibold">Suhu Ruang</th>
                        <th className="p-4 font-semibold">Lembab Oven</th>
                        <th className="p-4 font-semibold border-l border-slate-200 dark:border-slate-700">Suhu Luar</th>
                        <th className="p-4 font-semibold">Lembab Luar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayTableData].reverse().map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm">
                          <td className="p-4 font-mono">{row.time}</td>
                          <td className="p-4">{row.roomTemp.toFixed(1)} °C</td>
                          <td className="p-4 text-blue-500">{row.humidity.toFixed(1)} %</td>
                          <td className="p-4 border-l border-slate-100 dark:border-slate-800 text-slate-400">{row.ambientTemp.toFixed(1)} °C</td>
                          <td className="p-4 text-slate-400">{row.ambientHumidity.toFixed(1)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col h-[600px] shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><ShieldAlert size={20} className={isEStop ? "text-rose-500 animate-pulse" : "text-emerald-500"} /> Log Sistem</h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.map((alarm, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl ring-1 ${alarm.type === "CRITICAL" ? "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/30" : alarm.type === "SUCCESS" ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30" : "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-amber-600" : alarm.type === "SUCCESS" ? "text-emerald-600" : "text-blue-600"}`}>{alarm.type}</span>
                        <span className="text-xs font-mono text-slate-400">{alarm.time}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${alarm.type === "SUCCESS" ? "text-emerald-700 font-medium dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}>{alarm.message}</p>
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

function GradientCard({ title, value, unit, icon, color, statusColor, isTimer = false, alert = false }: any) {
  return (
    <div className={`relative overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border ${alert ? "border-emerald-400 dark:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "border-slate-200 dark:border-white/5"} shadow-sm hover:shadow-md transition-all hover:-translate-y-1`}>
      <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${color} opacity-10 dark:opacity-20 rounded-full blur-2xl transition-opacity duration-500`}></div>
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {statusColor && <div className={`w-3 h-3 rounded-full ${statusColor} transition-colors duration-500`}></div>}
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>{icon}</div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <h3 className={`${isTimer ? "text-3xl font-mono" : "text-4xl"} font-extrabold tracking-tight ${alert ? "text-emerald-500" : "text-slate-800 dark:text-white"}`}>{value}</h3>
        {unit && <span className="text-lg font-medium text-slate-400 dark:text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}