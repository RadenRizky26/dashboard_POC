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
  Gauge,
  ShieldAlert,
  Settings2,
  Sun,
  Moon,
  Wifi,
  FlaskConical,
  Download,
  AlertOctagon,
  SlidersHorizontal,
  ClipboardList,
  TableProperties,
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
  type: "WARNING" | "INFO" | "CRITICAL";
  message: string;
}
interface BatchHistory {
  id: string;
  data: ProcessData[];
}

export default function UltimateDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  const [systemStatus, setSystemStatus] = useState<"RUNNING" | "STOPPED">(
    "STOPPED",
  );
  const [isEStop, setIsEStop] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [batchId, setBatchId] = useState<string>("PRD-2602-01");
  const [targetRpm, setTargetRpm] = useState<number>(120);

  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    {
      id: "1",
      time: new Date().toLocaleTimeString("id-ID"),
      type: "INFO",
      message: "Sistem HMI siap. Material diset ke Kulit Buah Kopi.",
    } as AlarmLog,
  ]);

  const [metrics, setMetrics] = useState({ temp: 32.5, ph: 6.8, rpm: 0 });

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

  const toggleEStop = () => {
    setIsEStop(!isEStop);
    setSystemStatus("STOPPED");
    if (!isEStop) {
      setAlarms((prev) =>
        [
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString("id-ID"),
            type: "CRITICAL",
            message: "EMERGENCY STOP DITEKAN MANUAL!",
          } as AlarmLog,
          ...prev,
        ].slice(0, 50),
      );
    }
  };

  const startNewBatch = () => {
    if (trendData.length > 0) {
      setPastBatches((prev) => [
        { id: batchId, data: [...trendData] },
        ...prev,
      ]);
    }
    const newId = `PRD-${Math.floor(Math.random() * 10000)}`;
    setBatchId(newId);

    setTrendData([]);
    setViewingBatchId("current");

    setAlarms((prev) =>
      [
        {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString("id-ID"),
          type: "INFO",
          message: `Batch baru dimulai: ${newId}`,
        } as AlarmLog,
        ...prev,
      ].slice(0, 50),
    );
  };

  const exportToCSV = () => {
    const dataToExport =
      viewingBatchId === "current"
        ? trendData
        : pastBatches.find((b) => b.id === viewingBatchId)?.data || [];
    const exportId = viewingBatchId === "current" ? batchId : viewingBatchId;

    if (dataToExport.length === 0) {
      alert("Tidak ada data untuk di-export pada batch ini.");
      return;
    }

    const headers = "Waktu,Suhu(C),pH,RPM Aktual\n";
    const csvData = dataToExport
      .map(
        (row) =>
          `${row.time},${row.temperature.toFixed(2)},${row.ph.toFixed(2)},${row.rpm}`,
      )
      .join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_POC_${exportId}.csv`;
    a.click();
  };

  // ==========================================
  // PERBAIKAN LOGIKA TERMODINAMIKA (SUHU)
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Logika Suhu Berdasarkan Status Mesin
      let tempDelta = 0;
      if (systemStatus === "RUNNING" && !isEStop) {
        // Pemanasan: Cenderung naik saat mesin menyala (+0.1 s/d +0.6)
        tempDelta = Math.random() * 0.5 + 0.1;
      } else {
        // Pendinginan: Cenderung turun saat mesin mati atau E-Stop (-0.2 s/d -0.7)
        tempDelta = -(Math.random() * 0.5 + 0.2);
      }

      let newTemp = +(metrics.temp + tempDelta).toFixed(2);

      // Batas bawah pendinginan: suhu tidak mungkin turun di bawah suhu ruangan (misal 28°C)
      if (newTemp < 28) {
        newTemp = +(28 + Math.random() * 0.5).toFixed(2);
      }

      const newPh = +(6.5 + Math.random() * 0.5).toFixed(2);

      // 2. Logika RPM Ramping
      let newRpm = metrics.rpm;
      if (systemStatus === "RUNNING" && !isEStop) {
        const rpmStep = 15;
        if (newRpm < targetRpm) newRpm = Math.min(newRpm + rpmStep, targetRpm);
        else if (newRpm > targetRpm)
          newRpm = Math.max(newRpm - rpmStep, targetRpm);
      } else {
        newRpm = 0; // Jika mati, RPM langsung 0
      }

      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // 3. Logika Interlock Keselamatan
      if (newTemp >= 40 && !isEStop) {
        setIsEStop(true);
        setSystemStatus("STOPPED"); // Otomatis mati, sehingga pada detik berikutnya suhu akan mulai turun (cooling)
        setAlarms((prev) =>
          [
            {
              id: Date.now().toString(),
              time: now,
              type: "CRITICAL",
              message:
                "INTERLOCK: Suhu Kritis (>40°C). Mesin dimatikan otomatis!",
            } as AlarmLog,
            ...prev,
          ].slice(0, 50),
        );
        newRpm = 0;
      } else if (
        newTemp > 36 &&
        newTemp < 40 &&
        alarms.length > 0 &&
        alarms[0].message.indexOf("optimal") === -1
      ) {
        setAlarms((prev) =>
          [
            {
              id: Date.now().toString(),
              time: now,
              type: "WARNING",
              message:
                "Suhu melampaui batas optimal (36°C). Periksa pendingin.",
            } as AlarmLog,
            ...prev,
          ].slice(0, 50),
        );
      }

      setMetrics({ temp: newTemp, ph: newPh, rpm: newRpm });

      // 4. Update Grafik Historis
      setTrendData((prevTrend) => {
        const nextData = [
          ...prevTrend,
          {
            time: now.slice(0, 5),
            temperature: newTemp,
            ph: newPh,
            rpm: newRpm,
          },
        ];
        return nextData.length > 15 ? nextData.slice(1) : nextData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [systemStatus, metrics, alarms, targetRpm, isEStop]);

  if (!isClient) return null;

  const chartColors = {
    grid: isDarkMode ? "#334155" : "#e2e8f0",
    axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode
      ? "rgba(15, 23, 42, 0.9)"
      : "rgba(255, 255, 255, 0.9)",
    tooltipBorder: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    tooltipText: isDarkMode ? "#fff" : "#0f172a",
  };

  const displayTableData =
    viewingBatchId === "current"
      ? trendData
      : pastBatches.find((b) => b.id === viewingBatchId)?.data || [];

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
                POC{" "}
                <span className="font-light text-slate-400 dark:text-slate-500">
                  POLMAN Bandung
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium text-xs tracking-wider mr-4">
              <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full ring-1 ring-slate-200 dark:ring-white/5 transition-colors">
                <Wifi
                  size={14}
                  className={isOnline ? "text-emerald-500" : "text-rose-500"}
                />
                {isOnline ? "Sensor Online" : "Sensor Offline"}
              </span>
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

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 ring-1 ring-slate-200 dark:ring-white/5 transition-all active:scale-95"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">
                System <span className="text-emerald-500">Overview</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">
                Monitoring mesin pengaduk Pupuk Organik Cair terintegrasi.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl ring-1 ring-slate-200 dark:ring-white/5 transition-colors flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-0.5">
                  Active Batch ID
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {batchId}
                </span>
              </div>
              <button
                onClick={toggleEStop}
                className={`p-3 px-8 rounded-xl font-black tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isEStop ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 ring-1 ring-rose-500/50 hover:bg-rose-600 hover:text-white"}`}
              >
                <AlertOctagon size={20} />
                {isEStop ? "RESET E-STOP" : "E-STOP"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("control")}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}
            >
              <SlidersHorizontal size={18} /> Control Panel
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"}`}
            >
              <ClipboardList size={18} /> Data & Logs
            </button>
          </div>

          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none transition-colors">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 transition-colors flex-1 md:flex-none">
                  <FlaskConical size={20} className="text-amber-500" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">
                      Material Baku
                    </span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">
                      Kulit Buah Kopi
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 transition-colors flex-1 md:flex-none">
                  <Settings2 size={20} className="text-purple-500" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">
                      Set Target RPM
                    </span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="250"
                        step="10"
                        value={targetRpm}
                        disabled={systemStatus === "RUNNING"}
                        onChange={(e) => setTargetRpm(Number(e.target.value))}
                        className="w-24 accent-purple-500 cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono w-8">
                        {targetRpm}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 transition-colors ml-auto">
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
                          className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === "RUNNING" ? "bg-emerald-500" : isEStop ? "bg-rose-500" : "bg-slate-400 dark:bg-slate-600"}`}
                        ></span>
                      </span>
                      <span
                        className={`text-sm font-bold ${systemStatus === "RUNNING" ? "text-emerald-600 dark:text-emerald-400" : isEStop ? "text-rose-600 dark:text-rose-400" : "text-slate-500"}`}
                      >
                        {isEStop ? "LOCKED" : systemStatus}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setSystemStatus(
                        systemStatus === "RUNNING" ? "STOPPED" : "RUNNING",
                      )
                    }
                    disabled={isEStop}
                    className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      systemStatus === "RUNNING"
                        ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white"
                        : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <Zap size={18} />{" "}
                    {systemStatus === "RUNNING" ? "SHUTDOWN" : "START MIXER"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  title="Kecepatan Motor (SV)"
                  value={metrics.rpm}
                  unit="RPM"
                  icon={<Gauge size={24} />}
                  color="from-purple-500 to-purple-700 dark:from-indigo-500 dark:to-purple-600"
                  isDark={isDarkMode}
                />
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none transition-colors duration-500">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Fermentation Analytics
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Real-time data tren Suhu, pH, dan RPM Motor
                </p>

                <div className="h-[350px] w-full">
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
                        <linearGradient
                          id="colorPh"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
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
                        domain={[0, 250]}
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
            </div>
          )}

          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none transition-colors duration-500 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <TableProperties size={20} className="text-blue-500" />{" "}
                      Data Historis
                    </h3>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={viewingBatchId}
                      onChange={(e) => setViewingBatchId(e.target.value)}
                      className="text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 outline-none text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                    >
                      <option value="current">🟢 Current ({batchId})</option>
                      {pastBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          📁 History ({b.id})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={startNewBatch}
                      className="text-xs bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl ring-1 ring-slate-200 dark:ring-white/10 hover:bg-slate-200 dark:hover:bg-slate-700 transition font-bold text-slate-600 dark:text-slate-300"
                    >
                      + NEW BATCH
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/20 px-4 py-2 rounded-xl ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/40 transition font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      <Download size={14} /> EXPORT CSV
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        <th className="p-4 font-semibold">Waktu</th>
                        <th className="p-4 font-semibold">Suhu (°C)</th>
                        <th className="p-4 font-semibold">pH</th>
                        <th className="p-4 font-semibold">RPM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayTableData].reverse().map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm transition-colors"
                        >
                          <td className="p-4 font-mono">{row.time}</td>
                          <td className="p-4">{row.temperature.toFixed(2)}</td>
                          <td className="p-4">{row.ph.toFixed(2)}</td>
                          <td className="p-4">{row.rpm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayTableData.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      Menunggu data sensor masuk...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[600px] transition-colors duration-500">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <ShieldAlert
                    size={20}
                    className={
                      isEStop
                        ? "text-rose-500 animate-pulse"
                        : "text-emerald-500"
                    }
                  />{" "}
                  System Logs & K3
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Pencatatan event, peringatan sistem, dan error.
                </p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-4 rounded-2xl ring-1 transition-colors ${alarm.type === "CRITICAL" ? "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/30" : "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/60"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {alarm.type === "WARNING" && (
                            <AlertTriangle
                              size={16}
                              className="text-amber-500 dark:text-amber-400"
                            />
                          )}
                          {alarm.type === "CRITICAL" && (
                            <AlertOctagon
                              size={16}
                              className="text-rose-600 dark:text-rose-500"
                            />
                          )}
                          {alarm.type === "INFO" && (
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500 dark:text-emerald-400"
                            />
                          )}
                          <span
                            className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-amber-600 dark:text-amber-400" : alarm.type === "CRITICAL" ? "text-rose-600 dark:text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}
                          >
                            {alarm.type}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                          {alarm.time}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${alarm.type === "CRITICAL" ? "text-rose-700 dark:text-rose-300 font-medium" : "text-slate-600 dark:text-slate-300"}`}
                      >
                        {alarm.message}
                      </p>
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
      className={`relative overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border ${alert ? "border-rose-400 dark:border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] dark:shadow-[0_0_20px_rgba(244,63,94,0.2)]" : "border-slate-200 dark:border-white/5"} shadow-sm hover:shadow-md dark:shadow-none group transition-all hover:-translate-y-1`}
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
          className={`text-4xl font-extrabold tracking-tight ${alert ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-slate-800 dark:text-white"}`}
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
