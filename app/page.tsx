"use client";
import React, { useState, useEffect } from "react";
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  Activity, Clock, Zap, Thermometer, Gauge, 
  Sun, Moon, Download, Power, CheckCircle2,
  SlidersHorizontal, ClipboardList, ShieldCheck
} from "lucide-react";

// --- Types ---
interface ProcessData { 
  time: string; 
  suhu: number; 
  pwr_heater_mikro: number; 
  pwr_heater_python: number;
  rpm_mikro: number;
  rpm_python: number;
}

interface AlarmLog { id: string; time: string; type: string; message: string; }

export default function IndustrialInformaticsDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");
  const [processState, setProcessState] = useState<"IDLE" | "RUNNING">("IDLE");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  
  const [metrics, setMetrics] = useState({ 
    suhu: 0, pwr_heater_mikro: 0, pwr_heater_python: 0, 
    rpm_mikro: 0, rpm_python: 0 
  });

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    { id: "1", time: new Date().toLocaleTimeString('id-ID'), type: "INFO", message: "Dashboard Terhubung ke API Python Cloud. Menunggu data..." }
  ]);

  useEffect(() => { setIsClient(true); }, []);

  // ==========================================
  // FETCH DATA DARI API PYTHON (VERSI CLOUD)
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/index'); 
        const result = await response.json();

        if (result.status === "success" && result.data) {
          const cloud = result.data;
          const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

          // Mapping data sesuai struktur Master/Slave & Verifikasi Python
          const currentMetrics = {
            suhu: cloud.slave?.suhu || 0,
            pwr_heater_mikro: cloud.slave?.heaterPower || 0,
            pwr_heater_python: cloud.verifikasi?.heater_python || 0,
            rpm_mikro: cloud.master?.rpm || 0,
            rpm_python: cloud.verifikasi?.rpm_python || 0
          };

          setMetrics(currentMetrics);

          if (processState === "RUNNING") {
            setTrendData(prev => [...prev, { time: nowStr, ...currentMetrics }].slice(-50));
          }
        }
      } catch (error) { 
        console.error("Fetch Error:", error); 
      }
    };

    const interval = setInterval(fetchData, 2000); // Polling setiap 2 detik
    return () => clearInterval(interval);
  }, [processState]);

  // ==========================================
  // FUNGSI EKSPOR CSV TERPISAH
  // ==========================================
  const exportThermalCSV = () => {
    if (trendData.length === 0) return alert("Belum ada data.");
    const headers = "Waktu;Suhu(C);Heater_Mikro(%);Heater_Python(%)\n";
    const body = trendData.map(r => `${r.time};${r.suhu};${r.pwr_heater_mikro};${r.pwr_heater_python}`).join("\n");
    downloadFile(headers + body, "Log_Slave_Thermal.csv");
  };

  const exportMotorCSV = () => {
    if (trendData.length === 0) return alert("Belum ada data.");
    const headers = "Waktu;RPM_Mikro;RPM_Python\n";
    const body = trendData.map(r => `${r.time};${r.rpm_mikro};${r.rpm_python}`).join("\n");
    downloadFile(headers + body, "Log_Master_Motor.csv");
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
  };

  if (!isClient) return null;

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200 transition-colors duration-500 pb-10">
        
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg"><Activity size={24} className="text-white" /></div>
            <h1 className="font-extrabold text-xl uppercase tracking-tighter">
              Industrial <span className="font-light text-slate-500">Informatics</span>
            </h1>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-white/5">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-tight">System <span className="text-emerald-500">Verification</span></h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Monitoring Real-time Master (Motor) & Slave (Thermal) via Cloud Analysis.</p>
            </div>
            <button 
              onClick={() => setProcessState(processState === "IDLE" ? "RUNNING" : "IDLE")} 
              className={`px-10 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${
                processState === "IDLE" ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
              }`}
            >
              <Power size={20} className="inline mr-2"/> {processState === "IDLE" ? "START MONITOR" : "STOP MONITOR"}
            </button>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab("control")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><SlidersHorizontal size={18} /> Visual Panel</button>
            <button onClick={() => setActiveTab("logs")} className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}><ClipboardList size={18} /> Data History</button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard title="Suhu Aktual" value={metrics.suhu.toFixed(1)} unit="°C" icon={<Thermometer />} color="from-orange-500 to-red-500" />
                <KPICard title="RPM Aktual" value={metrics.rpm_mikro.toFixed(0)} unit="RPM" icon={<Gauge />} color="from-blue-500 to-indigo-500" />
                <KPICard title="Heater Verify (PY)" value={metrics.pwr_heater_python.toFixed(1)} unit="%" icon={<Zap />} color="from-amber-500 to-orange-500" />
                <KPICard title="RPM Verify (PY)" value={metrics.rpm_python.toFixed(1)} unit="RPM" icon={<ShieldCheck />} color="from-emerald-500 to-teal-500" />
              </div>

              {/* GRID GRAFIK: KIRI THERMAL, KANAN MOTOR */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* GRAFIK 1 (KIRI): THERMAL VERIFICATION */}
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl shadow-black/5">
                  <h3 className="text-lg font-black mb-1 uppercase tracking-tighter text-orange-500">Slave: Thermal Analysis</h3>
                  <p className="text-xs text-slate-500 mb-8 font-bold">Heater Power: Mikro (Solid) vs Python (Dashed)</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05}/>
                        <XAxis dataKey="time" fontSize={10} tickLine={false} />
                        <YAxis yAxisId="left" fontSize={10} domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" fontSize={10} domain={[25, 50]} />
                        <Tooltip contentStyle={{borderRadius:'15px', border:'none', background:'#0f172a', color:'#fff'}}/>
                        <Legend verticalAlign="top" align="right"/>
                        <Area yAxisId="right" type="monotone" dataKey="suhu" name="Suhu (°C)" fill="#f97316" fillOpacity={0.05} stroke="#f97316" strokeWidth={1} isAnimationActive={false}/>
                        <Line yAxisId="left" type="monotone" dataKey="pwr_heater_mikro" name="Heater Mikro" stroke="#ef4444" strokeWidth={3} dot={false} isAnimationActive={false}/>
                        <Line yAxisId="left" type="monotone" dataKey="pwr_heater_python" name="Heater Python" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* GRAFIK 2 (KANAN): MOTOR VERIFICATION */}
                <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl shadow-black/5">
                  <h3 className="text-lg font-black mb-1 uppercase tracking-tighter text-indigo-500">Master: Motor Performance</h3>
                  <p className="text-xs text-slate-500 mb-8 font-bold">RPM Speed: Mikro (Solid) vs Python (Dashed)</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05}/>
                        <XAxis dataKey="time" fontSize={10} tickLine={false} />
                        <YAxis fontSize={10} />
                        <Tooltip contentStyle={{borderRadius:'15px', border:'none', background:'#0f172a', color:'#fff'}}/>
                        <Legend verticalAlign="top" align="right"/>
                        <Line type="monotone" dataKey="rpm_mikro" name="RPM Mikro" stroke="#8b5cf6" strokeWidth={3} dot={false} isAnimationActive={false}/>
                        <Line type="monotone" dataKey="rpm_python" name="RPM Python" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false}/>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 animate-in slide-in-from-bottom-5 duration-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500">Master-Slave Records</h3>
                <div className="flex gap-3">
                  <button onClick={exportThermalCSV} className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-95 transition-all"><Download size={14} className="inline mr-2"/> Thermal CSV</button>
                  <button onClick={exportMotorCSV} className="bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-95 transition-all"><Download size={14} className="inline mr-2"/> Motor CSV</button>
                </div>
              </div>
              <div className="overflow-auto max-h-[500px] scrollbar-hide">
                <table className="w-full text-left text-sm uppercase tracking-widest">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 opacity-50 z-10 font-black">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="p-5">Waktu</th>
                      <th className="p-5">Suhu (S)</th>
                      <th className="p-5">Heater M (S)</th>
                      <th className="p-5">RPM M (M)</th>
                      <th className="p-5">RPM PY (V)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trendData].reverse().map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-5 font-mono text-[11px] opacity-40">{row.time}</td>
                        <td className="p-5 font-black text-orange-500">{row.suhu.toFixed(1)}°</td>
                        <td className="p-5 font-bold">{row.pwr_heater_mikro.toFixed(0)}%</td>
                        <td className="p-5 font-black text-indigo-500">{row.rpm_mikro.toFixed(0)}</td>
                        <td className="p-5 italic opacity-60 font-medium">{row.rpm_python.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function KPICard({ title, value, unit, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl shadow-black/5 transition-all hover:-translate-y-1">
      <div className="flex justify-between mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className="text-4xl font-black tracking-tighter">{value}</h3>
        <span className="text-slate-400 text-[10px] font-black italic">{unit}</span>
      </div>
    </div>
  );
}