"use client";
import React, { useState, useEffect } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Thermometer, Gauge, Zap, Download, Power, Moon, Sun, ClipboardList, SlidersHorizontal } from "lucide-react";

// --- Interface Data ---
interface ProcessData { 
  time: string; 
  suhu: number; 
  h_pwr: number; // Slave
  rpm: number;   // Master
  m_pwr: number; // Master
}

export default function CloudMonitorDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");
  const [processState, setProcessState] = useState<"IDLE" | "RUNNING">("IDLE");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [metrics, setMetrics] = useState({ suhu: 0, h_pwr: 0, rpm: 0, m_pwr: 0 });

  useEffect(() => { setIsClient(true); }, []);

  // Fetch Data dari API Relay
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/index');
        const r = await res.json();
        if (r.status === "success" && r.data) {
          const d = r.data;
          const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          
          const cur = {
            suhu: d.slave?.suhu || 0,
            h_pwr: d.slave?.heaterPower || 0,
            rpm: d.master?.rpm || 0,
            m_pwr: d.master?.motorPower || 0
          };

          setMetrics(cur);
          if (processState === "RUNNING") {
            setTrendData(prev => [...prev, { time: now, ...cur }].slice(-50));
          }
        }
      } catch (e) { console.error("Fetch Error:", e); }
    };
    const itv = setInterval(fetchData, 2000);
    return () => clearInterval(itv);
  }, [processState]);

  // --- Fungsi Export CSV Terpisah ---
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };

  const exportSlaveCSV = () => {
    const head = "Waktu;Suhu(C);HeaterPower(%)\n";
    const body = trendData.map(r => `${r.time};${r.suhu};${r.h_pwr}`).join("\n");
    downloadCSV(head + body, "Log_Slave_Thermal.csv");
  };

  const exportMasterCSV = () => {
    const head = "Waktu;RPM;MotorPower(%)\n";
    const body = trendData.map(r => `${r.time};${r.rpm};${r.m_pwr}`).join("\n");
    downloadCSV(head + body, "Log_Master_Motor.csv");
  };

  if (!isClient) return null;

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200 transition-colors">
        
        {/* Header Nav */}
        <nav className="p-6 border-b dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg text-white"><Activity size={20}/></div>
            <h1 className="font-black uppercase tracking-tighter text-lg">Polman <span className="font-light opacity-50">Informatics</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg">
              {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={() => setProcessState(processState === "IDLE" ? "RUNNING" : "IDLE")} className={`px-6 py-2 rounded-xl font-bold text-sm ${processState === "IDLE" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
              {processState === "IDLE" ? "START MONITOR" : "STOP MONITOR"}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1400px] mx-auto">
          {/* Dashboard Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard t="Suhu Slave" v={metrics.suhu.toFixed(1)} u="°C" c="text-orange-500" i={<Thermometer/>}/>
            <StatCard t="Power Heater" v={metrics.h_pwr} u="%" c="text-red-500" i={<Zap/>}/>
            <StatCard t="RPM Master" v={metrics.rpm} u="RPM" c="text-indigo-500" i={<Gauge/>}/>
            <StatCard t="Power Motor" v={metrics.m_pwr} u="%" c="text-purple-500" i={<Zap/>}/>
          </div>

          {/* Tab Menu */}
          <div className="flex gap-6 mb-6 border-b dark:border-white/10">
            <button onClick={() => setActiveTab("control")} className={`pb-4 font-bold text-sm ${activeTab === "control" ? "text-emerald-500 border-b-2 border-emerald-500" : "opacity-50"}`}>VISUALIZATION</button>
            <button onClick={() => setActiveTab("logs")} className={`pb-4 font-bold text-sm ${activeTab === "logs" ? "text-emerald-500 border-b-2 border-emerald-500" : "opacity-50"}`}>DATA LOGS</button>
          </div>

          {activeTab === "control" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
              {/* KIRI: THERMAL ANALYSIS */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5">
                <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-orange-500">Left: Thermal Analysis (Slave)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer>
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeOpacity={0.1} vertical={false}/>
                      <XAxis dataKey="time" fontSize={10}/>
                      <YAxis yAxisId="left" fontSize={10} domain={[0, 100]} label={{ value: 'Power %', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} domain={[20, 50]} label={{ value: 'Temp °C', angle: 90, position: 'insideRight', fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', background: '#1e293b', border: 'none', color: '#fff' }}/>
                      <Legend/>
                      <Area yAxisId="right" type="monotone" dataKey="suhu" name="Suhu Aktual" fill="#f97316" fillOpacity={0.1} stroke="#f97316" strokeWidth={2}/>
                      <Line yAxisId="left" type="monotone" dataKey="h_pwr" name="Power Heater" stroke="#ef4444" strokeWidth={3} dot={false}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* KANAN: MOTOR ANALYSIS */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5">
                <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-indigo-500">Right: Motor Analysis (Master)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer>
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeOpacity={0.1} vertical={false}/>
                      <XAxis dataKey="time" fontSize={10}/>
                      <YAxis yAxisId="left" fontSize={10} label={{ value: 'RPM', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} domain={[0, 100]} label={{ value: 'Power %', angle: 90, position: 'insideRight', fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', background: '#1e293b', border: 'none', color: '#fff' }}/>
                      <Legend/>
                      <Line yAxisId="left" type="monotone" dataKey="rpm" name="RPM Aktual" stroke="#6366f1" strokeWidth={3} dot={false}/>
                      <Line yAxisId="right" type="monotone" dataKey="m_pwr" name="Power Motor" stroke="#a855f7" strokeWidth={2} dot={false}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold uppercase tracking-tighter">Monitoring Records</h3>
                <div className="flex gap-2">
                  <button onClick={exportSlaveCSV} className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-95 transition-all"><Download size={14} className="inline mr-1"/> Slave CSV</button>
                  <button onClick={exportMasterCSV} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-95 transition-all"><Download size={14} className="inline mr-1"/> Master CSV</button>
                </div>
              </div>
              <div className="overflow-auto max-h-[450px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 uppercase text-[10px] tracking-widest text-slate-400">
                    <tr className="border-b dark:border-white/10">
                      <th className="p-4">Time</th>
                      <th className="p-4 text-orange-500">Temp (S)</th>
                      <th className="p-4">Heater (S)</th>
                      <th className="p-4 text-indigo-500">RPM (M)</th>
                      <th className="p-4">Motor (M)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trendData].reverse().map((r, i) => (
                      <tr key={i} className="border-b dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-[11px] opacity-50">{r.time}</td>
                        <td className="p-4 font-bold">{r.suhu.toFixed(1)}°</td>
                        <td className="p-4">{r.h_pwr.toFixed(0)}%</td>
                        <td className="p-4 font-bold">{r.rpm.toFixed(0)}</td>
                        <td className="p-4">{r.m_pwr.toFixed(0)}%</td>
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

function StatCard({ t, v, u, c, i }: any) {
  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border dark:border-white/5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t}</span>
        <div className={`${c} opacity-80`}>{i}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className="text-3xl font-black">{v}</h3>
        <span className="text-slate-400 text-xs font-bold uppercase">{u}</span>
      </div>
    </div>
  );
}