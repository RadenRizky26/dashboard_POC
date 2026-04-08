"use client";
import React, { useState, useEffect, useRef } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import { AlertTriangle, CheckCircle2, Activity, Database, Clock, Zap, Thermometer, Gauge, ShieldAlert, Settings2, Sun, Moon, Wifi, FlaskConical, Download, AlertOctagon, SlidersHorizontal, ClipboardList, TableProperties, Power, CalendarCheck } from "lucide-react";

// --- Types ---
interface ProcessData { time: string; temperature: number; dimmer: number; rpm: number; days: number; }
interface AlarmLog { id: string; time: string; type: "WARNING" | "INFO" | "CRITICAL" | "SUCCESS"; message: string; }
interface BatchHistory { id: string; data: ProcessData[]; }

type ProcessState = "IDLE" | "RUNNING" | "COMPLETED";

export default function FuzzyPIDDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [processState, setProcessState] = useState<ProcessState>("IDLE");
  const [isEStop, setIsEStop] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Setpoints Menggunakan Rentang (Min & Max)
  const [targetTempMin, setTargetTempMin] = useState<number>(38);
  const [targetTempMax, setTargetTempMax] = useState<number>(42);
  const [targetRpmMin, setTargetRpmMin] = useState<number>(110);
  const [targetRpmMax, setTargetRpmMax] = useState<number>(130);
  const TARGET_DAYS = 14; 

  const [batchId, setBatchId] = useState<string>("PRD-Kopi-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "1", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Inisialisasi Sistem Hardware Selesai. Menunggu perintah..." } as AlarmLog,
  ]);

  const [metrics, setMetrics] = useState({ temp: 28.5, dimmer: 0, rpm: 0, days: 0 });
  const rpmVelocity = useRef(0);

  useEffect(() => {
    setIsClient(true);
    const initial = Array.from({ length: 20 }, (_, i) => ({
      time: `10:${i < 10 ? "0" + i : i}`, temperature: 28 + Math.random() * 0.5, dimmer: 0, rpm: 0, days: 0,
    }));
    setTrendData(initial);
  }, []);

  const toggleEStop = () => {
    setIsEStop(!isEStop);
    if (!isEStop) {
      setProcessState("IDLE");
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "CRITICAL", message: "EMERGENCY STOP! Semua Aktuator Dimatikan Paksa." } as AlarmLog, ...prev].slice(0, 50));
    } else {
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "E-Stop di-reset. Sistem Standby." } as AlarmLog, ...prev].slice(0, 50));
    }
  };

  const handleStartStop = () => {
    if (processState === "IDLE" || processState === "COMPLETED") {
      setProcessState("RUNNING");
      setMetrics(prev => ({ ...prev, days: 0 }));
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Sistem Aktif. Menjaga Suhu (${targetTempMin}-${targetTempMax}°C) & Motor (${targetRpmMin}-${targetRpmMax} RPM).` } as AlarmLog, ...prev].slice(0, 50));
    } else {
      setProcessState("IDLE");
      setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "WARNING", message: "Proses dihentikan manual oleh user." } as AlarmLog, ...prev].slice(0, 50));
    }
  };

  const startNewBatch = () => {
    if (trendData.length > 0) setPastBatches(prev => [{ id: batchId, data: [...trendData] }, ...prev]);
    const newId = `PRD-Kopi-${Math.floor(Math.random() * 1000)}`;
    setBatchId(newId);
    setTrendData([]); 
    setViewingBatchId("current"); 
    setProcessState("IDLE");
    setMetrics({ temp: 28.5, dimmer: 0, rpm: 0, days: 0 });
    setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: `Batch baru dimulai: ${newId}.` } as AlarmLog, ...prev].slice(0, 50));
  };

  const exportToCSV = () => {
    const dataToExport = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];
    if (dataToExport.length === 0) return alert("Tidak ada data untuk di-export.");
    const headers = "Waktu,Suhu(C),Dimmer(%),RPM Aktual,Hari\n";
    const csvData = dataToExport.map(row => `${row.time},${row.temperature.toFixed(2)},${row.dimmer.toFixed(0)},${row.rpm.toFixed(0)},${row.days.toFixed(1)}`).join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Log_Proses_${viewingBatchId === "current" ? batchId : viewingBatchId}.csv`;
    a.click();
  };

  // ==========================================
  // SIMULASI FUZZY HEATER & PID RPM (RENTANG)
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        let { temp, dimmer, rpm, days } = prev;
        const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        // Proteksi nilai terbalik
        const safeTempMin = Math.min(targetTempMin, targetTempMax);
        const safeTempMax = Math.max(targetTempMin, targetTempMax);
        const safeRpmMin = Math.min(targetRpmMin, targetRpmMax);
        const safeRpmMax = Math.max(targetRpmMin, targetRpmMax);

        if (isEStop) {
          dimmer = 0;
          temp = Math.max(28, temp - (Math.random() * 0.5 + 0.2));
          rpmVelocity.current = 0;
          rpm = Math.max(0, rpm - 20); 
        } 
        else if (processState === "RUNNING") {
          
          // 1. FUZZY LOGIC TEMPERATURE CONTROL
          let tempError = 0;
          if (temp < safeTempMin) tempError = safeTempMin - temp; 
          else if (temp > safeTempMax) tempError = safeTempMax - temp; 

          if (temp >= 50) {
            dimmer = 0;
            setIsEStop(true);
            setProcessState("IDLE");
            setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "CRITICAL", message: "ALARM: Suhu Sangat Kritis (>50°C). Sistem Interlock Aktif!" } as AlarmLog, ...a].slice(0, 50));
          } else {
            // Fuzzifikasi & Inferensi
            if (tempError > 5) dimmer = 95 + Math.random() * 5; 
            else if (tempError > 1) dimmer = 60 + (tempError * 5) + Math.random() * 5; 
            else if (tempError > 0) dimmer = 30 + Math.random() * 10; 
            else if (tempError === 0) dimmer = 10 + Math.random() * 5; 
            else dimmer = 0; 
          }
          
          let heatAdded = (dimmer / 100) * 0.8; 
          let heatLost = (temp > 28) ? 0.2 : 0; 
          temp += (heatAdded - heatLost);
          
          // 2. ANALOG PID RPM CONTROL 
          let activeTargetRpm = (safeRpmMin + safeRpmMax) / 2; 
          let rpmError = activeTargetRpm - rpm;
          let Kp = 0.35; 
          let Kd = 0.70; 
          
          rpmVelocity.current = (rpmVelocity.current + (rpmError * Kp)) * Kd;
          rpm += rpmVelocity.current + (Math.random() - 0.5) * 2;
          if (rpm < 0) { rpm = 0; rpmVelocity.current = 0; }

          // 3. TIMER FERMENTASI 
          if (temp >= safeTempMin && temp <= safeTempMax) { 
            days += 0.5; 
            if (days >= TARGET_DAYS) {
              days = TARGET_DAYS;
              setProcessState("COMPLETED");
              setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "SUCCESS", message: "PROSES SELESAI: Target 14 Hari tercapai." } as AlarmLog, ...a].slice(0, 50));
            }
          }

          // Logging Periodik
          if (Math.random() > 0.95 && processState === "RUNNING") {
            const errorText = tempError === 0 ? "Zona Aman" : `${tempError.toFixed(1)}°C`;
            setAlarms(a => [{ id: Date.now().toString(), time: nowStr, type: "INFO", message: `Fuzzy Update: Error ${errorText} -> PWM: ${dimmer.toFixed(0)}%` } as AlarmLog, ...a].slice(0, 50));
          }
        } 
        else {
          // IDLE / COMPLETED
          dimmer = 0;
          temp = Math.max(28, temp - (Math.random() * 0.4 + 0.1));
          rpmVelocity.current = rpmVelocity.current * 0.5;
          rpm = Math.max(0, rpm + rpmVelocity.current - 5);
        }

        // Susun data metrics yang baru
        const newMetrics = { temp: +(temp.toFixed(2)), dimmer: +(dimmer.toFixed(1)), rpm: +(rpm.toFixed(1)), days };

        // PERBAIKAN: Update TrendData dengan aman di sini!
        setTrendData(prevTrend => {
          const nextData = [...prevTrend, { time: nowStr.slice(0, 5), temperature: newMetrics.temp, dimmer: newMetrics.dimmer, rpm: newMetrics.rpm, days: newMetrics.days }];
          return nextData.length > 25 ? nextData.slice(1) : nextData;
        });

        return newMetrics;
      });

    }, 1500); 

    return () => clearInterval(interval);
  }, [processState, isEStop, targetTempMin, targetTempMax, targetRpmMin, targetRpmMax]);

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0", axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)", tooltipBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", tooltipText: isDarkMode ? "#fff" : "#0f172a",
  };

  const displayTableData = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0a0f1c] dark:to-[#050810] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-500 selection:bg-emerald-500/30 pb-10">
        
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm shadow-slate-200/40 dark:shadow-none transition-colors duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 dark:ring-white/20">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                NEXUS <span className="font-light text-slate-400 dark:text-slate-500">Fuzzy-PID</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-emerald-500 ring-1 ring-slate-200 dark:ring-white/5 transition-all">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Advanced <span className="text-emerald-500">HMI Dashboard</span></h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">Monitoring Kontrol Fuzzy Logic & Analog PID berdasarkan Rentang (Band).</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl ring-1 ring-slate-200 dark:ring-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">Active Batch ID</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{batchId}</span>
              </div>
              <button onClick={toggleEStop} className={`p-3 px-8 rounded-xl font-black tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isEStop ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 ring-1 ring-rose-500/50 hover:bg-rose-600 hover:text-white"}`}>
                <AlertOctagon size={20} /> {isEStop ? "RESET E-STOP" : "E-STOP"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab("control")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><SlidersHorizontal size={18} /> Control Panel</button>
            <button onClick={() => setActiveTab("logs")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><ClipboardList size={18} /> Data & Logs</button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              {/* Panel Input Angka & Start (MENGGUNAKAN RENTANG) */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
                
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex-1">
                  <Thermometer size={20} className="text-orange-500" />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rentang Suhu (°C)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={targetTempMin} onChange={(e) => setTargetTempMin(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50" />
                      <span className="text-slate-400 font-bold">-</span>
                      <input type="number" value={targetTempMax} onChange={(e) => setTargetTempMax(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex-1">
                  <Settings2 size={20} className="text-purple-500" />
                  <div className="flex flex-col w-full">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Rentang Motor (RPM)</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={targetRpmMin} onChange={(e) => setTargetRpmMin(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50" />
                      <span className="text-slate-400 font-bold">-</span>
                      <input type="number" value={targetRpmMax} onChange={(e) => setTargetRpmMax(Number(e.target.value))} disabled={processState === "RUNNING"} className="w-16 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none text-lg font-bold text-slate-800 dark:text-white text-center disabled:opacity-50" />
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleStartStop} disabled={isEStop}
                  className={`px-10 py-5 rounded-2xl font-black tracking-widest flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 ${
                    processState === "IDLE" || processState === "COMPLETED"
                      ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400" 
                      : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white ring-1 ring-rose-500/50"
                  }`}
                >
                  <Power size={24} /> {processState === "IDLE" || processState === "COMPLETED" ? "START SYSTEM" : "STOP SYSTEM"}
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GradientCard title="Suhu Aktual (PV)" value={metrics.temp.toFixed(1)} unit="°C" icon={<Thermometer size={24} />} color="from-orange-400 to-orange-600 dark:from-orange-500 dark:to-red-600" alert={metrics.temp > targetTempMax + 5} />
                <GradientCard title="Dimmer Heater" value={metrics.dimmer.toFixed(0)} unit="%" icon={<Zap size={24} />} color="from-yellow-400 to-amber-600 dark:from-yellow-500 dark:to-orange-600" />
                <GradientCard title="Kecepatan (PV)" value={metrics.rpm.toFixed(0)} unit="RPM" icon={<Gauge size={24} />} color="from-purple-500 to-purple-700 dark:from-indigo-500 dark:to-purple-600" alert={metrics.rpm > targetRpmMax + 20} />
                <GradientCard title="Waktu Proses" value={Math.floor(metrics.days)} unit={`/ ${TARGET_DAYS} Hari`} icon={<Clock size={24} />} color="from-blue-400 to-blue-600 dark:from-blue-500 dark:to-cyan-600" />
              </div>

              {/* GRID GRAFIK (SPLIT) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* GRAFIK 1: THERMAL (FUZZY LOGIC) */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Thermal Control (Fuzzy Logic)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Monitoring intervensi AC Dimmer menjaga suhu di dalam kotak target.</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                          <linearGradient id="colorDimmer" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.3} /><stop offset="95%" stopColor="#eab308" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis yAxisId="left" stroke="#f97316" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={[25, 50]} />
                        <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={10} tickLine={false} axisLine={false} dx={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, backdropFilter: "blur(10px)", border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "12px", color: chartColors.tooltipText, fontSize: "12px" }} />
                        
                        <ReferenceArea yAxisId="left" y1={targetTempMin} y2={targetTempMax} fill="#f97316" fillOpacity={0.15} />
                        <ReferenceLine yAxisId="left" y={targetTempMax} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} />
                        <ReferenceLine yAxisId="left" y={targetTempMin} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} />
                        
                        <Area yAxisId="left" type="monotone" dataKey="temperature" name="Suhu (PV)" stroke="#f97316" strokeWidth={3} fill="url(#colorTemp)" isAnimationActive={false} />
                        <Area yAxisId="right" type="stepAfter" dataKey="dimmer" name="Dimmer (%)" stroke="#eab308" strokeWidth={2} fill="url(#colorDimmer)" isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAFIK 2: MOTOR (ANALOG PID) */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Motor Speed (Analog PID)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Kurva osilasi (Damped Sine Wave) menuju zona rata-rata RPM.</p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <defs>
                          <linearGradient id="colorRpm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#a855f7" fontSize={10} tickLine={false} axisLine={false} dx={-10} domain={[0, 'dataMax + 50']} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, backdropFilter: "blur(10px)", border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: "12px", color: chartColors.tooltipText, fontSize: "12px" }} />
                        
                        <ReferenceArea y1={targetRpmMin} y2={targetRpmMax} fill="#a855f7" fillOpacity={0.15} />
                        <ReferenceLine y={targetRpmMax} stroke="#a855f7" strokeDasharray="3 3" opacity={0.5} />
                        <ReferenceLine y={targetRpmMin} stroke="#a855f7" strokeDasharray="3 3" opacity={0.5} />
                        
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
              
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><TableProperties size={20} className="text-blue-500" /> Historis Sensor</h3>
                  <div className="flex gap-2 items-center">
                    <select value={viewingBatchId} onChange={(e) => setViewingBatchId(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 outline-none text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                      <option value="current">🟢 Current ({batchId})</option>
                      {pastBatches.map(b => (<option key={b.id} value={b.id}>📁 History ({b.id})</option>))}
                    </select>
                    <button onClick={exportToCSV} className="text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-100 transition font-bold text-emerald-600"><Download size={14} /> CSV</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        <th className="p-4 font-semibold">Waktu</th>
                        <th className="p-4 font-semibold">Suhu (°C)</th>
                        <th className="p-4 font-semibold">RPM</th>
                        <th className="p-4 font-semibold">Dimmer (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayTableData].reverse().map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm">
                          <td className="p-4 font-mono">{row.time}</td>
                          <td className="p-4">{row.temperature.toFixed(2)}</td>
                          <td className="p-4">{row.rpm.toFixed(0)}</td>
                          <td className="p-4">{row.dimmer.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[600px]">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><ShieldAlert size={20} className={isEStop ? "text-rose-500 animate-pulse" : "text-emerald-500"} /> System & Fuzzy Logs</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Log intervensi kontrol & Diagram Alir K3.</p>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.map((alarm) => (
                    <div key={alarm.id} className={`p-4 rounded-2xl ring-1 ${alarm.type === "CRITICAL" ? "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/30" : alarm.type === "SUCCESS" ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30" : "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5"}`}>
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
    <div className={`relative overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border ${alert ? "border-rose-400 dark:border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] dark:shadow-[0_0_20px_rgba(244,63,94,0.2)]" : "border-slate-200 dark:border-white/5"} shadow-sm hover:shadow-md dark:shadow-none group transition-all hover:-translate-y-1`}>
      <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${color} opacity-10 dark:opacity-20 rounded-full blur-2xl group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity duration-500`}></div>
      <div className="relative z-10 flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>{icon}</div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <h3 className={`text-4xl font-extrabold tracking-tight ${alert ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-slate-800 dark:text-white"}`}>{value}</h3>
        <span className="text-lg font-medium text-slate-400 dark:text-slate-500">{unit}</span>
      </div>
    </div>
  );
}