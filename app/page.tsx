"use client";
import React, { useState, useEffect } from "react";
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend 
} from "recharts";
import { 
  Activity, Clock, Zap, Thermometer, Gauge, ShieldAlert, 
  Settings2, Sun, Moon, Download, AlertOctagon, 
  SlidersHorizontal, ClipboardList, Power 
} from "lucide-react";

// --- Types ---
interface ProcessData { 
  time: string; 
  temperature: number; 
  pwr_mikro: number; 
  pwr_python: number; 
  diff: number;
}

interface AlarmLog { 
  id: string; 
  time: string; 
  type: "WARNING" | "INFO" | "CRITICAL" | "SUCCESS"; 
  message: string; 
}

export default function FuzzyPIDDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [processState, setProcessState] = useState<"IDLE" | "RUNNING">("IDLE");
  const [isEStop, setIsEStop] = useState(false);
  
  // Setpoints
  const [targetTempMin, setTargetTempMin] = useState<number>(38);
  const [targetTempMax, setTargetTempMax] = useState<number>(42);
  const [targetRpm, setTargetRpm] = useState<number>(120);

  const [batchId, setBatchId] = useState<string>("PRD-DATA-POC-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "1", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Sistem Terhubung ke Cloud Python Backend." }
  ]);

  const [metrics, setMetrics] = useState({ 
    temp: 0, 
    pwr_mikro: 0, 
    pwr_python: 0, 
    diff: 0 
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ==========================================
  // INTEGRASI DATA DARI PYTHON (API/INDEX)
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mengambil data dari Backend Python (Vercel Serverless atau Local)
        const response = await fetch('/api/index'); 
        const result = await response.json();

        if (result.status === "success" && result.data) {
          const cloud = result.data;
          const nowStr = new Date().toLocaleTimeString("id-ID", { 
            hour: "2-digit", minute: "2-digit", second: "2-digit" 
          });

          const currentMetrics = {
            temp: cloud.suhu_aktual || 0,
            pwr_mikro: cloud.perbandingan_power?.power_mikrokontroler || 0,
            pwr_python: cloud.perbandingan_power?.power_python || 0,
            diff: cloud.perbandingan_power?.selisih_error_persen || 0
          };

          setMetrics(currentMetrics);

          if (processState === "RUNNING") {
            setTrendData(prev => {
              const newData = [
                ...prev, 
                { 
                  time: nowStr, 
                  temperature: currentMetrics.temp,
                  pwr_mikro: currentMetrics.pwr_mikro,
                  pwr_python: currentMetrics.pwr_python,
                  diff: currentMetrics.diff
                }
              ];
              return newData.slice(-50); // Simpan 50 data terakhir saja
            });
          }
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      }
    };

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [processState]);

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0",
    axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200 transition-colors duration-500 pb-10">
        
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight">
              DASHBOARD <span className="font-light text-slate-500">Verification</span>
            </h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Live <span className="text-emerald-500">Python Analysis</span></h2>
              <p className="text-slate-500">Membandingkan perhitungan Mikrokontroler (ESP32) dengan Model Fuzzy Python.</p>
            </div>
            <button 
              onClick={() => setProcessState(processState === "IDLE" ? "RUNNING" : "IDLE")}
              className={`px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${
                processState === "IDLE" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white"
              }`}
            >
              <Power size={20} /> {processState === "IDLE" ? "START MONITORING" : "STOP MONITORING"}
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard title="Suhu Aktual" value={metrics.temp.toFixed(1)} unit="°C" icon={<Thermometer />} color="from-orange-500 to-red-500" />
            <MetricCard title="ESP32 Power" value={metrics.pwr_mikro.toFixed(1)} unit="%" icon={<Zap />} color="from-cyan-500 to-blue-500" />
            <MetricCard title="Python Power" value={metrics.pwr_python.toFixed(1)} unit="%" icon={<Settings2 />} color="from-purple-500 to-indigo-500" />
            <MetricCard title="Selisih (Error)" value={metrics.diff.toFixed(2)} unit="%" icon={<ShieldAlert />} color="from-rose-500 to-pink-500" alert={metrics.diff > 5} />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Chart 1: Perbandingan Power */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
              <h3 className="text-lg font-bold mb-1">Power Comparison (Mikro vs Python)</h3>
              <p className="text-xs text-slate-500 mb-6">Verifikasi algoritma Fuzzy secara real-time.</p>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} />
                    <YAxis stroke={chartColors.axis} fontSize={10} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: "12px", border: "none" }} />
                    <Legend />
                    <Line type="monotone" dataKey="pwr_mikro" name="ESP32 PWM" stroke="#06b6d4" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="pwr_python" name="Python PWM" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Selisih Analitis */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
              <h3 className="text-lg font-bold mb-1">Analytical Deviation (Selisih)</h3>
              <p className="text-xs text-slate-500 mb-6">Memonitor tingkat presisi antara hardware dan software.</p>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient id="colorDiff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} />
                    <YAxis stroke={chartColors.axis} fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: "12px", border: "none" }} />
                    <Area type="stepAfter" dataKey="diff" name="Selisih (%)" stroke="#f43f5e" fill="url(#colorDiff)" />
                    <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Toleransi', fill: '#f43f5e', fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon, color, alert = false }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900/50 p-6 rounded-3xl border ${alert ? "border-rose-500" : "border-slate-200 dark:border-white/5"} transition-all hover:-translate-y-1`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-extrabold">{value}</h3>
        <span className="text-slate-400">{unit}</span>
      </div>
    </div>
  );
}