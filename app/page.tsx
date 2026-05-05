"use client";
import React, { useState, useEffect } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity, Download, Thermometer, Gauge, Zap, Moon, Sun, Power, ClipboardList, SlidersHorizontal } from "lucide-react";

export default function DashboardRaden() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");
  const [processState, setProcessState] = useState<"IDLE" | "RUNNING">("IDLE");
  const [trendData, setTrendData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ suhu: 0, rpm_m: 0, h_m: 0, h_v: 0, rpm_v: 0 });

  useEffect(() => { setIsClient(true); }, []);

  // Fetch data dari Python Cloud
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
            h_m: d.slave?.heaterPower || 0,
            h_v: d.verifikasi?.heater_python || 0,
            rpm_m: d.master?.rpm || 0,
            rpm_v: d.verifikasi?.rpm_python || 0
          };
          setMetrics(cur);
          if (processState === "RUNNING") setTrendData(prev => [...prev, { time: now, ...cur }].slice(-50));
        }
      } catch (e) { console.error(e); }
    };
    const itv = setInterval(fetchData, 2000);
    return () => clearInterval(itv);
  }, [processState]);

  // Fungsi Export CSV Terpisah
  const saveCSV = (data: any[], headers: string, name: string) => {
    const blob = new Blob([headers + data.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
  };

  const exportThermal = () => {
    const head = "Waktu;Suhu(C);Heater_Mikro(%);Heater_Python(%)\n";
    const body = trendData.map(r => `${r.time};${r.suhu};${r.h_m};${r.h_v}`);
    saveCSV(body, head, "Log_Slave_Thermal.csv");
  };

  const exportMotor = () => {
    const head = "Waktu;RPM_Mikro;RPM_Python\n";
    const body = trendData.map(r => `${r.time};${r.rpm_m};${r.rpm_v}`);
    saveCSV(body, head, "Log_Master_Motor.csv");
  };

  if (!isClient) return null;

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-800 dark:text-slate-200 p-8 transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2 rounded-xl text-white"><Activity size={24}/></div>
            <h1 className="text-xl font-black uppercase">Informatics Industry <span className="font-light opacity-50">Cloud</span></h1>
          </div>
          <button onClick={() => setProcessState(processState === "IDLE" ? "RUNNING" : "IDLE")} className={`px-8 py-3 rounded-xl font-bold ${processState === "IDLE" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
            {processState === "IDLE" ? "START MONITOR" : "STOP MONITOR"}
          </button>
        </div>

        {/* Charts: Kiri Thermal, Kanan Motor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5">
            <h3 className="font-bold mb-4 uppercase text-sm tracking-widest text-orange-500">Thermal Analysis (Slave)</h3>
            <div className="h-[250px]"><ResponsiveContainer>
              <ComposedChart data={trendData}><CartesianGrid strokeOpacity={0.1} vertical={false}/><XAxis dataKey="time" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Legend/>
                <Line type="monotone" dataKey="h_m" name="Heater Mikro" stroke="#ef4444" strokeWidth={3} dot={false}/>
                <Line type="monotone" dataKey="h_v" name="Heater Python" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false}/>
              </ComposedChart></ResponsiveContainer></div>
          </div>
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5">
            <h3 className="font-bold mb-4 uppercase text-sm tracking-widest text-indigo-500">Motor Performance (Master)</h3>
            <div className="h-[250px]"><ResponsiveContainer>
              <ComposedChart data={trendData}><CartesianGrid strokeOpacity={0.1} vertical={false}/><XAxis dataKey="time" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Legend/>
                <Line type="monotone" dataKey="rpm_m" name="RPM Mikro" stroke="#6366f1" strokeWidth={3} dot={false}/>
                <Line type="monotone" dataKey="rpm_v" name="RPM Python" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false}/>
              </ComposedChart></ResponsiveContainer></div>
          </div>
        </div>

        {/* Logs & Export */}
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border dark:border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold uppercase tracking-tighter">Data Records</h3>
            <div className="flex gap-2">
              <button onClick={exportThermal} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase"><Download size={14} className="inline mr-1"/> Thermal CSV</button>
              <button onClick={exportMotor} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase"><Download size={14} className="inline mr-1"/> Motor CSV</button>
            </div>
          </div>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 uppercase opacity-50"><tr className="border-b dark:border-white/10"><th className="p-3">Waktu</th><th className="p-3">Suhu</th><th className="p-3">H.Mikro</th><th className="p-3">RPM.Mikro</th><th className="p-3">RPM.Python</th></tr></thead>
              <tbody>{trendData.slice().reverse().map((r, i) => (
                <tr key={i} className="border-b dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"><td className="p-3 font-mono">{r.time}</td><td className="p-3">{r.suhu}°</td><td className="p-3">{r.h_m}%</td><td className="p-3 font-bold">{r.rpm_m}</td><td className="p-3 italic">{r.rpm_v.toFixed(1)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}