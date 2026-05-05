"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Legend 
} from "recharts";
import { 
  Activity, Clock, Zap, Thermometer, Gauge, ShieldAlert, 
  Settings2, Sun, Moon, Download, AlertOctagon, 
  SlidersHorizontal, ClipboardList, Power, CheckCircle2
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

interface BatchHistory { id: string; data: ProcessData[]; }

export default function FuzzyPIDDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [processState, setProcessState] = useState<"IDLE" | "RUNNING">("IDLE");
  const [batchId, setBatchId] = useState<string>("PRD-VERIFY-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "1", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Sistem Terhubung ke Cloud Python Backend. Siap memverifikasi data." }
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
  // INTEGRASI DATA DARI PYTHON (FETCHING)
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
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
              return newData.slice(-50); 
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

  // --- Functions ---
  const handleStartStop = () => {
    setProcessState(prev => prev === "IDLE" ? "RUNNING" : "IDLE");
    const msg = processState === "IDLE" ? "Mulai monitoring & verifikasi." : "Monitoring dihentikan.";
    setAlarms(prev => [{ id: Date.now().toString(), time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: msg }, ...prev]);
  };

  const startNewBatch = () => {
    if (trendData.length > 0) setPastBatches(prev => [{ id: batchId, data: [...trendData] }, ...prev]);
    const newId = `BATCH-${Math.floor(Math.random() * 1000)}`;
    setBatchId(newId);
    setTrendData([]);
    setViewingBatchId("current");
  };

  const exportThermalCSV = () => {
    const dataToExport = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];
    if (dataToExport.length === 0) return alert("Tidak ada data.");
    const headers = "Suhu(C);PWM_Mikro(%);PWM_Python(%);Waktu\n";
    const csvData = dataToExport.map(row => `${row.temperature.toFixed(2)};${row.pwr_mikro};${row.pwr_python};${row.time}`).join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Log_Thermal_${batchId}.csv`;
    a.click();
  };

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0",
    axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
  };

  const displayTableData = viewingBatchId === "current" ? trendData : pastBatches.find(b => b.id === viewingBatchId)?.data || [];

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200 transition-colors duration-500 pb-10">
        
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight">
              DASHBOARD <span className="font-light text-slate-500">Python-Verify</span>
            </h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 ring-1 ring-slate-200 dark:ring-white/5">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Live <span className="text-emerald-500">Analysis</span></h2>
              <p className="text-slate-500">Verifikasi perhitungan Fuzzy Logic ESP32 terhadap Model Python di Cloud.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl ring-1 ring-slate-200 dark:ring-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Batch</span>
                <span className="font-mono font-bold text-emerald-500">{batchId}</span>
              </div>
              <button onClick={handleStartStop} className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${processState === "IDLE" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white"}`}>
                <Power size={20} /> {processState === "IDLE" ? "START MONITOR" : "STOP MONITOR"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab("control")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><SlidersHorizontal size={18} /> Real-time Charts</button>
            <button onClick={() => setActiveTab("logs")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><ClipboardList size={18} /> Data History</button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard title="Suhu Aktual" value={metrics.temp.toFixed(1)} unit="°C" icon={<Thermometer size={24}/>} color="from-orange-500 to-red-500" />
                <MetricCard title="ESP32 PWM" value={metrics.pwr_mikro.toFixed(0)} unit="%" icon={<Zap size={24}/>} color="from-cyan-500 to-blue-500" />
                <MetricCard title="Python PWM" value={metrics.pwr_python.toFixed(0)} unit="%" icon={<Settings2 size={24}/>} color="from-purple-500 to-indigo-500" />
                <MetricCard title="Selisih (Error)" value={metrics.diff.toFixed(2)} unit="%" icon={<ShieldAlert size={24}/>} color="from-rose-500 to-pink-500" alert={metrics.diff > 5} />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Chart 1: Comparison */}
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-lg font-bold mb-1">Fuzzy Verification Curve</h3>
                  <p className="text-xs text-slate-500 mb-6">ESP32 Power vs Python Simulation.</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} />
                        <YAxis yAxisId="left" stroke={chartColors.axis} fontSize={10} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: "12px", border: "none" }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="pwr_mikro" name="ESP32 PWM" stroke="#06b6d4" strokeWidth={3} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="pwr_python" name="Python PWM" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Deviation */}
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-lg font-bold mb-1">Analytical Deviation</h3>
                  <p className="text-xs text-slate-500 mb-6">Monitoring selisih algoritma (%) secara real-time.</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis dataKey="time" stroke={chartColors.axis} fontSize={10} tickLine={false} />
                        <YAxis stroke={chartColors.axis} fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, borderRadius: "12px", border: "none" }} />
                        <Area type="stepAfter" dataKey="diff" name="Error (%)" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
                        <ReferenceLine y={2} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Limit', fill: '#f43f5e', fontSize: 10 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
               <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col h-[600px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-500" /> Verification Log</h3>
                    <div className="flex gap-2">
                       <select value={viewingBatchId} onChange={(e) => setViewingBatchId(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl outline-none border border-slate-200 dark:border-white/10 font-bold">
                          <option value="current">Current ({batchId})</option>
                          {pastBatches.map(b => <option key={b.id} value={b.id}>{b.id}</option>)}
                       </select>
                       <button onClick={exportThermalCSV} className="text-xs flex items-center gap-1 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold"><Download size={14} /> Export CSV</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="p-3">Waktu</th>
                          <th className="p-3">Suhu</th>
                          <th className="p-3">PWM Mikro</th>
                          <th className="p-3">PWM Python</th>
                          <th className="p-3">Diff (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...displayTableData].reverse().map((row, i) => (
                          <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="p-3 font-mono text-xs text-slate-400">{row.time}</td>
                            <td className="p-3 font-bold">{row.temperature.toFixed(1)}°</td>
                            <td className="p-3">{row.pwr_mikro.toFixed(0)}%</td>
                            <td className="p-3">{row.pwr_python.toFixed(0)}%</td>
                            <td className={`p-3 font-bold ${row.diff > 5 ? "text-rose-500" : "text-emerald-500"}`}>{row.diff.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col h-[600px]">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Clock size={20} className="text-blue-500" /> System Events</h3>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {alarms.map((alarm, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl ring-1 ${alarm.type === "INFO" ? "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5" : "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/20"}`}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] font-bold text-blue-500">{alarm.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{alarm.time}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{alarm.message}</p>
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

function MetricCard({ title, value, unit, icon, color, alert = false }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900/50 p-6 rounded-3xl border ${alert ? "border-rose-500 shadow-lg shadow-rose-500/20" : "border-slate-200 dark:border-white/5"} transition-all hover:-translate-y-1`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-500">{title}</span>
        <div className={`p-2 rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className={`text-4xl font-extrabold ${alert ? "text-rose-500 animate-pulse" : ""}`}>{value}</h3>
        <span className="text-slate-400 font-medium">{unit}</span>
      </div>
    </div>
  );
}