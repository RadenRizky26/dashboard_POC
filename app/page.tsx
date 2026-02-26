"use client";
import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Clock,
  Zap,
  Thermometer,
  Droplets,
  Gauge,
  ShieldAlert,
} from "lucide-react";

// --- Types ---
interface ProcessData {
  time: string;
  temperature: number;
  ph: number;
}
interface AlarmLog {
  id: string;
  time: string;
  type: "WARNING" | "INFO";
  message: string;
}

export default function UltimateDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"RUNNING" | "STOPPED">(
    "STOPPED",
  );
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [alarms, setAlarms] = useState<AlarmLog[]>([
    {
      id: "1",
      time: "09:45:22",
      type: "INFO",
      message: "Koneksi ke ESP8266 stabil.",
    },
  ]);

  const [metrics, setMetrics] = useState({
    temp: 32.5,
    ph: 6.8,
    level: 85,
    rpm: 0,
  });

  useEffect(() => {
    setIsClient(true);
    const initial = Array.from({ length: 15 }, (_, i) => ({
      time: `10:${i < 10 ? "0" + i : i}`,
      temperature: 30 + Math.random() * 5,
      ph: 6.5 + Math.random() * 0.5,
    }));
    setTrendData(initial);
  }, []);

  useEffect(() => {
    if (systemStatus === "STOPPED") return;
    const interval = setInterval(() => {
      const newTemp = +(metrics.temp + (Math.random() - 0.5)).toFixed(2);
      const newPh = +(6.5 + Math.random() * 0.5).toFixed(2);

      setMetrics((prev) => ({
        ...prev,
        temp: newTemp,
        ph: newPh,
        rpm: systemStatus === "RUNNING" ? 120 : 0,
      }));

      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setTrendData((prev) => [
        ...prev.slice(1),
        { time: now.slice(0, 5), temperature: newTemp, ph: newPh },
      ]);

      if (newTemp > 36 && alarms.length < 5) {
        setAlarms((prev) => [
          {
            id: Date.now().toString(),
            time: now,
            type: "WARNING",
            message: "K3 Alert: Suhu melampaui batas optimal (36°C)",
          },
          ...prev.slice(0, 4),
        ]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [systemStatus, metrics, alarms.length]);

  if (!isClient) return null;

  return (
    // Background menggunakan radial gradient yang sangat halus agar tidak flat
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1c] to-[#050810] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Top Navigation - Glassmorphism */}
      <nav className="sticky top-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center shadow-2xl shadow-black/50">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
              POC <span className="font-light text-slate-500">NEXUS</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-6 text-slate-400 font-medium text-xs tracking-wider">
          <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-white/5">
            <Database size={14} className="text-blue-400" /> PostgreSQL Sync
          </span>
          <span className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-white/5">
            <Clock size={14} className="text-emerald-400" />{" "}
            {new Date().toLocaleDateString("id-ID")}
          </span>
        </div>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header & Main Control */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              System <span className="text-emerald-500">Overview</span>
            </h2>
            <p className="text-slate-400">
              Monitoring mesin pengaduk Pupuk Organik Cair terintegrasi.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/30 p-2 rounded-2xl ring-1 ring-white/5 backdrop-blur-md">
            <div className="pl-4 pr-2 flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                Engine State
              </span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  {systemStatus === "RUNNING" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === "RUNNING" ? "bg-emerald-500" : "bg-rose-500"}`}
                  ></span>
                </span>
                <span
                  className={`text-sm font-bold ${systemStatus === "RUNNING" ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {systemStatus}
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                setSystemStatus(
                  systemStatus === "RUNNING" ? "STOPPED" : "RUNNING",
                )
              }
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 active:scale-95 ${
                systemStatus === "RUNNING"
                  ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white ring-1 ring-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                  : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white ring-1 ring-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              }`}
            >
              <Zap size={18} />
              {systemStatus === "RUNNING" ? "SHUTDOWN" : "START MIXER"}
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GradientCard
            title="Suhu Tangki (PV)"
            value={metrics.temp.toFixed(1)}
            unit="°C"
            icon={<Thermometer size={24} />}
            color="from-orange-500 to-red-600"
            alert={metrics.temp > 35}
          />
          <GradientCard
            title="Level pH (PV)"
            value={metrics.ph.toFixed(2)}
            unit="pH"
            icon={<Activity size={24} />}
            color="from-blue-500 to-cyan-600"
          />
          <GradientCard
            title="Volume Cairan"
            value={metrics.level}
            unit="%"
            icon={<Droplets size={24} />}
            color="from-teal-400 to-emerald-600"
          />
          <GradientCard
            title="Kecepatan Motor (SV)"
            value={metrics.rpm}
            unit="RPM"
            icon={<Gauge size={24} />}
            color="from-indigo-500 to-purple-600"
          />
        </div>

        {/* Bawah: Grafik & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area Chart Section */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Dekorasi Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Fermentation Analytics
                </h3>
                <p className="text-sm text-slate-400">
                  Real-time data tren Suhu dan pH
                </p>
              </div>
              <div className="bg-slate-800/50 px-4 py-2 rounded-xl ring-1 ring-white/5">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold block mb-1">
                  MES Batch ID
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  PRD-2602-01
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    domain={[25, 45]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f97316"
                    strokeWidth={3}
                    fill="url(#colorTemp)"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="ph"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fill="url(#colorPh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alarm & Log Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-500" /> System Logs
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Pencatatan event & peringatan K3
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="bg-slate-800/40 p-4 rounded-2xl ring-1 ring-white/5 hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {alarm.type === "WARNING" ? (
                        <AlertTriangle size={16} className="text-rose-400" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      )}
                      <span
                        className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {alarm.type}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {alarm.time}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {alarm.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Custom Component untuk Kartu Metrik dengan efek Glow dan Gradien
function GradientCard({ title, value, unit, icon, color, alert = false }: any) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border ${alert ? "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]" : "border-white/5"} group transition-all hover:-translate-y-1`}
    >
      {/* Background Gradient Decorative */}
      <div
        className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${color} opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity duration-500`}
      ></div>

      <div className="relative z-10 flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-400">{title}</span>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <h3
          className={`text-4xl font-extrabold tracking-tight ${alert ? "text-rose-400" : "text-white"}`}
        >
          {value}
        </h3>
        <span className="text-lg font-medium text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
