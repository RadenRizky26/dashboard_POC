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
  Settings2,
  Sun,
  Moon,
} from "lucide-react";

// --- Types ---
interface ProcessData {
  time: string;
  temperature: number;
  ph: number;
  rpm: number;
}
interface AlarmLog {
  id: string;
  time: string;
  type: "WARNING" | "INFO";
  message: string;
}

export default function UltimateDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // State untuk Theme
  const [systemStatus, setSystemStatus] = useState<"RUNNING" | "STOPPED">(
    "STOPPED",
  );
  const [targetRpm, setTargetRpm] = useState<number>(120);
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [alarms, setAlarms] = useState<AlarmLog[]>([
    {
      id: "1",
      time: "09:45:22",
      type: "INFO",
      message: "Koneksi sistem antarmuka stabil.",
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
      rpm: 0,
    }));
    setTrendData(initial);
  }, []);

  useEffect(() => {
    if (systemStatus === "STOPPED") {
      if (metrics.rpm !== 0) {
        setMetrics((prev) => ({ ...prev, rpm: 0 }));
        const now = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setTrendData((prev) => [
          ...prev.slice(1),
          {
            time: now.slice(0, 5),
            temperature: metrics.temp,
            ph: metrics.ph,
            rpm: 0,
          },
        ]);
      }
      return;
    }

    const interval = setInterval(() => {
      const newTemp = +(metrics.temp + (Math.random() - 0.5)).toFixed(2);
      const newPh = +(6.5 + Math.random() * 0.5).toFixed(2);
      const currentRpm = targetRpm;

      setMetrics((prev) => ({
        ...prev,
        temp: newTemp,
        ph: newPh,
        rpm: currentRpm,
      }));

      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTrendData((prev) => [
        ...prev.slice(1),
        {
          time: now.slice(0, 5),
          temperature: newTemp,
          ph: newPh,
          rpm: currentRpm,
        },
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
  }, [systemStatus, metrics, alarms.length, targetRpm]);

  if (!isClient) return null;

  // Warna dinamis untuk Recharts menyesuaikan tema
  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0",
    axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode
      ? "rgba(15, 23, 42, 0.9)"
      : "rgba(255, 255, 255, 0.9)",
    tooltipBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    tooltipText: isDarkMode ? "#fff" : "#0f172a",
  };

  return (
    // Wrapper utama untuk mendeteksi class "dark"
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0a0f1c] dark:to-[#050810] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-500 selection:bg-emerald-500/30">
        {/* Top Navigation */}
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm dark:shadow-2xl dark:shadow-black/50 transition-colors duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 dark:ring-white/20">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                POC{" "}
                <span className="font-light text-slate-400 dark:text-slate-500">
                  NEXUS
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium text-xs tracking-wider mr-4">
              <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-slate-200 dark:ring-white/5 transition-colors">
                <Database
                  size={14}
                  className="text-blue-500 dark:text-blue-400"
                />{" "}
                PostgreSQL Sync
              </span>
              <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-slate-200 dark:ring-white/5 transition-colors">
                <Clock
                  size={14}
                  className="text-emerald-500 dark:text-emerald-400"
                />{" "}
                {new Date().toLocaleDateString("id-ID")}
              </span>
            </div>

            {/* Toggle Tema (Light / Dark) */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 ring-1 ring-slate-200 dark:ring-white/5 transition-all active:scale-95"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto space-y-8">
          {/* Header & Main Control */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">
                System <span className="text-emerald-500">Overview</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">
                Monitoring mesin pengaduk Pupuk Organik Cair terintegrasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Control Target RPM */}
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800/30 p-2 pl-4 pr-5 rounded-2xl ring-1 ring-purple-500/20 shadow-sm dark:shadow-none backdrop-blur-md transition-colors">
                <div className="bg-purple-100 dark:bg-purple-500/10 p-2 rounded-xl">
                  <Settings2
                    size={20}
                    className="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">
                    Set Target RPM
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      step="10"
                      value={targetRpm}
                      onChange={(e) => setTargetRpm(Number(e.target.value))}
                      className="w-24 accent-purple-500 cursor-pointer"
                    />
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono w-8">
                      {targetRpm}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engine State Control */}
              <div className="flex items-center gap-4 bg-white dark:bg-slate-800/30 p-2 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 shadow-sm dark:shadow-none backdrop-blur-md transition-colors">
                <div className="pl-4 pr-2 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold">
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
                      className={`text-sm font-bold ${systemStatus === "RUNNING" ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}
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
                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 hover:bg-rose-500 hover:text-white ring-1 ring-rose-500/30 dark:ring-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500 hover:text-white ring-1 ring-emerald-500/30 dark:ring-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                  }`}
                >
                  <Zap size={18} />
                  {systemStatus === "RUNNING" ? "SHUTDOWN" : "START MIXER"}
                </button>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GradientCard
              title="Suhu Tangki (PV)"
              value={metrics.temp.toFixed(1)}
              unit="°C"
              icon={<Thermometer size={24} />}
              color="from-orange-400 to-orange-600 dark:from-orange-500 dark:to-red-600"
              alert={metrics.temp > 35}
              isDark={isDarkMode}
            />
            <GradientCard
              title="Level pH (PV)"
              value={metrics.ph.toFixed(2)}
              unit="pH"
              icon={<Activity size={24} />}
              color="from-blue-400 to-blue-600 dark:from-blue-500 dark:to-cyan-600"
              isDark={isDarkMode}
            />
            <GradientCard
              title="Volume Cairan"
              value={metrics.level}
              unit="%"
              icon={<Droplets size={24} />}
              color="from-teal-400 to-teal-600 dark:from-teal-400 dark:to-emerald-600"
              isDark={isDarkMode}
            />
            <GradientCard
              title="Kecepatan Motor (SV)"
              value={metrics.rpm}
              unit="RPM"
              icon={<Gauge size={24} />}
              color="from-purple-500 to-purple-700 dark:from-indigo-500 dark:to-purple-600"
              isDark={isDarkMode}
            />
          </div>

          {/* Bawah: Grafik & Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composed Chart Section */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/50 relative overflow-hidden transition-colors duration-500">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white transition-colors">
                    Fermentation Analytics
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
                    Real-time data tren Suhu, pH, dan RPM Motor
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/5 transition-colors">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold block mb-1">
                    MES Batch ID
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    PRD-2602-01
                  </span>
                </div>
              </div>

              <div className="h-[320px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <defs>
                      <linearGradient
                        id="colorTemp"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#0ea5e9"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0ea5e9"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke={chartColors.axis}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />

                    <YAxis
                      yAxisId="left"
                      stroke={chartColors.axis}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      domain={[25, 45]}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#a855f7"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={10}
                      domain={[0, 220]}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        backdropFilter: "blur(10px)",
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: "16px",
                        color: chartColors.tooltipText,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      }}
                    />

                    <ReferenceLine
                      yAxisId="right"
                      y={targetRpm}
                      stroke="#a855f7"
                      strokeDasharray="5 5"
                      label={{
                        position: "insideTopLeft",
                        value: `TARGET: ${targetRpm}`,
                        fill: "#a855f7",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    />

                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature"
                      name="Suhu (°C)"
                      stroke="#f97316"
                      strokeWidth={3}
                      fill="url(#colorTemp)"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="ph"
                      name="pH"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      fill="url(#colorPh)"
                    />
                    <Line
                      yAxisId="right"
                      type="stepAfter"
                      dataKey="rpm"
                      name="RPM Aktual"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alarm & Log Section */}
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-slate-900/50 flex flex-col transition-colors duration-500">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2 transition-colors">
                <ShieldAlert size={20} className="text-rose-500" /> System Logs
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 transition-colors">
                Pencatatan event & peringatan K3
              </p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {alarms.map((alarm) => (
                  <div
                    key={alarm.id}
                    className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {alarm.type === "WARNING" ? (
                          <AlertTriangle
                            size={16}
                            className="text-rose-500 dark:text-rose-400"
                          />
                        ) : (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-500 dark:text-emerald-400"
                          />
                        )}
                        <span
                          className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
                        >
                          {alarm.type}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                        {alarm.time}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alarm.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function GradientCard({
  title,
  value,
  unit,
  icon,
  color,
  alert = false,
  isDark,
}: any) {
  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border ${alert ? "border-rose-400 dark:border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] dark:shadow-[0_0_20px_rgba(244,63,94,0.2)]" : "border-slate-200 dark:border-white/5"} shadow-md dark:shadow-none group transition-all hover:-translate-y-1`}
    >
      <div
        className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${color} opacity-10 dark:opacity-20 rounded-full blur-2xl group-hover:opacity-30 dark:group-hover:opacity-40 transition-opacity duration-500`}
      ></div>

      <div className="relative z-10 flex justify-between items-start mb-4">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <h3
          className={`text-4xl font-extrabold tracking-tight ${alert ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white"}`}
        >
          {value}
        </h3>
        <span className="text-lg font-medium text-slate-400 dark:text-slate-500">
          {unit}
        </span>
      </div>
    </div>
  );
}
