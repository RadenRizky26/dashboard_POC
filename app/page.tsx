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
  Power,
  CalendarCheck,
} from "lucide-react";

// --- Types ---
interface ProcessData {
  time: string;
  temperature: number;
  dimmer: number;
  days: number;
}
interface AlarmLog {
  id: string;
  time: string;
  type: "WARNING" | "INFO" | "CRITICAL" | "SUCCESS";
  message: string;
}
interface BatchHistory {
  id: string;
  data: ProcessData[];
}

type ProcessState = "IDLE" | "HEATING" | "FERMENTING" | "COMPLETED";

export default function FlowchartDashboard() {
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"control" | "logs">("control");

  // State Flowchart
  const [processState, setProcessState] = useState<ProcessState>("IDLE");
  const TARGET_TEMP = 40; // Setpoint Suhu sesuai Flowchart
  const TARGET_DAYS = 14; // Target Fermentasi sesuai Flowchart

  const [isEStop, setIsEStop] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [batchId, setBatchId] = useState<string>("PRD-Kopi-01");
  const [trendData, setTrendData] = useState<ProcessData[]>([]);
  const [pastBatches, setPastBatches] = useState<BatchHistory[]>([]);
  const [viewingBatchId, setViewingBatchId] = useState<string>("current");

  const [alarms, setAlarms] = useState<AlarmLog[]>([
    {
      id: "1",
      time: new Date().toLocaleTimeString("id-ID"),
      type: "INFO",
      message: "Inisiasi Sistem Hardware selesai. Menunggu Penekanan PB A.",
    } as AlarmLog,
  ]);

  // Metrics: Suhu, AC Dimmer Output (%), dan Hari
  const [metrics, setMetrics] = useState({ temp: 28.5, dimmer: 0, days: 0 });

  useEffect(() => {
    setIsClient(true);
    const initial = Array.from({ length: 15 }, (_, i) => ({
      time: `10:${i < 10 ? "0" + i : i}`,
      temperature: 28 + Math.random() * 1,
      dimmer: 0,
      days: 0,
    }));
    setTrendData(initial);
  }, []);

  const toggleEStop = () => {
    setIsEStop(!isEStop);
    if (!isEStop) {
      setProcessState("IDLE");
      setAlarms((prev) =>
        [
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString("id-ID"),
            type: "CRITICAL",
            message: "EMERGENCY STOP! Heater Dimatikan Paksa.",
          } as AlarmLog,
          ...prev,
        ].slice(0, 50),
      );
    } else {
      setAlarms((prev) =>
        [
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString("id-ID"),
            type: "INFO",
            message: "E-Stop di-reset. Menunggu Penekanan PB A.",
          } as AlarmLog,
          ...prev,
        ].slice(0, 50),
      );
    }
  };

  // Tombol ini mewakili "Penekanan PB A" di Flowchart
  const handlePushButtonA = () => {
    if (processState === "IDLE" || processState === "COMPLETED") {
      setProcessState("HEATING");
      setMetrics((prev) => ({ ...prev, days: 0 })); // Reset hari jika mulai ulang
      setAlarms((prev) =>
        [
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString("id-ID"),
            type: "INFO",
            message: `PB A Ditekan. Setpoint Suhu: 40°C. Heater Menyala.`,
          } as AlarmLog,
          ...prev,
        ].slice(0, 50),
      );
    } else {
      setProcessState("IDLE"); // Tombol Stop Manual
      setAlarms((prev) =>
        [
          {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString("id-ID"),
            type: "WARNING",
            message: "Proses dihentikan manual oleh user.",
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
    const newId = `PRD-Kopi-${Math.floor(Math.random() * 1000)}`;
    setBatchId(newId);
    setTrendData([]);
    setViewingBatchId("current");
    setProcessState("IDLE");
    setMetrics({ temp: 28.5, dimmer: 0, days: 0 });
    setAlarms((prev) =>
      [
        {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString("id-ID"),
          type: "INFO",
          message: `Batch baru dimulai: ${newId}. Menunggu Penekanan PB A.`,
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
    if (dataToExport.length === 0)
      return alert("Tidak ada data untuk di-export pada batch ini.");

    const headers = "Waktu,Suhu(C),Dimmer(%),Waktu Fermentasi(Hari)\n";
    const csvData = dataToExport
      .map(
        (row) =>
          `${row.time},${row.temperature.toFixed(2)},${row.dimmer},${row.days.toFixed(1)}`,
      )
      .join("\n");
    const blob = new Blob([headers + csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_Fermentasi_${viewingBatchId === "current" ? batchId : viewingBatchId}.csv`;
    a.click();
  };

  // ==========================================
  // LOGIKA SIMULASI SESUAI FLOWCHART
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        let { temp, dimmer, days } = prev;
        const nowStr = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        if (isEStop) {
          dimmer = 0;
          temp = Math.max(28, temp - (Math.random() * 0.5 + 0.2));
        } else if (processState === "HEATING") {
          // Fase 1: Heater Menyala (AC Dimmer Output Full)
          dimmer = 90 + Math.floor(Math.random() * 10); // Dimmer 90-100%
          temp += Math.random() * 0.8 + 0.5; // Suhu naik cepat

          // Decision: SUHU Sesuai? (>= 40°C)
          if (temp >= TARGET_TEMP) {
            setProcessState("FERMENTING");
            setAlarms((a) =>
              [
                {
                  id: Date.now().toString(),
                  time: nowStr,
                  type: "INFO",
                  message:
                    "Suhu 40°C tercapai. Memulai Proses Fermentasi 14 Hari.",
                } as AlarmLog,
                ...a,
              ].slice(0, 50),
            );
          }
        } else if (processState === "FERMENTING") {
          // Fase 2: Proses Fermentasi 14 Hari (AC Dimmer menstabilkan Suhu 40°C)
          if (temp < 39.5)
            dimmer = 60 + Math.floor(Math.random() * 20); // Tambah panas
          else if (temp > 40.5)
            dimmer = 10 + Math.floor(Math.random() * 10); // Kurangi panas
          else dimmer = 30 + Math.floor(Math.random() * 10); // Stabil

          temp += dimmer > 40 ? Math.random() * 0.2 : -(Math.random() * 0.2);

          // Simulasi waktu dipercepat (1 tick interval = 0.5 Hari di layar)
          days += 0.5;

          // Decision: Proses Fermentasi 14 Hari selesai?
          if (days >= TARGET_DAYS) {
            days = TARGET_DAYS;
            setProcessState("COMPLETED");
            // Heater Kondisi Off & HMI Menampilkan Proses Selesai
            setAlarms((a) =>
              [
                {
                  id: Date.now().toString(),
                  time: nowStr,
                  type: "SUCCESS",
                  message:
                    "PROSES SELESAI: Fermentasi 14 Hari berhasil. Heater OFF.",
                } as AlarmLog,
                ...a,
              ].slice(0, 50),
            );
          }
        } else if (processState === "COMPLETED" || processState === "IDLE") {
          // Fase 3: Selesai / Menunggu
          dimmer = 0; // Heater OFF
          temp = Math.max(28, temp - (Math.random() * 0.4 + 0.1)); // Suhu mendingin ke suhu ruang
        }

        // Keselamatan (Overheat Alert jika sistem error/simulasi melonjak)
        if (temp > 45 && !isEStop) {
          setIsEStop(true);
          setProcessState("IDLE");
          setAlarms((a) =>
            [
              {
                id: Date.now().toString(),
                time: nowStr,
                type: "CRITICAL",
                message:
                  "INTERLOCK: Overheat (>45°C). Heater Dimatikan Otomatis!",
              } as AlarmLog,
              ...a,
            ].slice(0, 50),
          );
          dimmer = 0;
        }

        const newMetrics = { temp: +temp.toFixed(2), dimmer, days };

        // Update Grafik
        setTrendData((prevTrend) => {
          const nextData = [
            ...prevTrend,
            {
              time: nowStr.slice(0, 5),
              temperature: newMetrics.temp,
              dimmer: newMetrics.dimmer,
              days: newMetrics.days,
            },
          ];
          return nextData.length > 20 ? nextData.slice(1) : nextData;
        });

        return newMetrics;
      });
    }, 2000); // Update setiap 2 detik

    return () => clearInterval(interval);
  }, [processState, isEStop]);

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

  // Teks Status HMI berdasarkan flowchart
  const getHmiStatusText = () => {
    if (isEStop) return { text: "SYSTEM LOCKED", color: "text-rose-500" };
    if (processState === "IDLE")
      return { text: "MENUNGGU PENEKANAN PB A", color: "text-slate-500" };
    if (processState === "HEATING")
      return {
        text: "HEATER MENYALA (MENCAPAI 40°C)",
        color: "text-orange-500 animate-pulse",
      };
    if (processState === "FERMENTING")
      return {
        text: "PROSES FERMENTASI (MAINTAIN 40°C)",
        color: "text-amber-500",
      };
    if (processState === "COMPLETED")
      return { text: "PROSES SELESAI", color: "text-emerald-500 font-black" };
    return { text: "-", color: "" };
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-[#0a0f1c] dark:to-[#050810] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-500 selection:bg-emerald-500/30 pb-10">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-4 flex justify-between items-center shadow-sm shadow-slate-200/40 dark:shadow-none transition-colors duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 dark:ring-white/20">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                POC{" "}
                <span className="font-light text-slate-400 dark:text-slate-500">
                  Thermal Control
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:text-emerald-500 ring-1 ring-slate-200 dark:ring-white/5 transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        <main className="p-8 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">
                Fermentation <span className="text-emerald-500">HMI</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 transition-colors">
                Sistem kontrol Heater & AC Dimmer sesuai Diagram Alir Kopi.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-2.5 rounded-xl ring-1 ring-slate-200 dark:ring-white/5 flex flex-col">
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
                <AlertOctagon size={20} /> {isEStop ? "RESET E-STOP" : "E-STOP"}
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("control")}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "control" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}
            >
              <SlidersHorizontal size={18} /> Control Panel
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === "logs" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500"}`}
            >
              <ClipboardList size={18} /> Data & Logs
            </button>
          </div>

          {/* TAB 1: CONTROL PANEL */}
          {activeTab === "control" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Panel Aksi & Status (HMI Menampilkan Sesuai Flowchart) */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
                {/* Status Teks Besar */}
                <div className="flex-1 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 pb-4 lg:pb-0 lg:pr-6">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">
                    STATUS LAYAR HMI
                  </span>
                  <div
                    className={`text-lg md:text-xl font-bold tracking-wide ${getHmiStatusText().color}`}
                  >
                    {getHmiStatusText().text}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex items-center gap-4">
                    <Thermometer size={20} className="text-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Setpoint Suhu
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-white">
                        {TARGET_TEMP} °C
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 pl-4 pr-5 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 flex items-center gap-4">
                    <CalendarCheck size={20} className="text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Target Fermentasi
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-white">
                        {TARGET_DAYS} Hari
                      </span>
                    </div>
                  </div>

                  {/* Push Button A */}
                  <button
                    onClick={handlePushButtonA}
                    disabled={isEStop}
                    className={`px-8 py-4 rounded-xl font-black tracking-widest flex items-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      processState === "IDLE" || processState === "COMPLETED"
                        ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
                        : "bg-rose-50 dark:bg-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white"
                    }`}
                  >
                    <Power size={20} />
                    {processState === "IDLE" || processState === "COMPLETED"
                      ? "TEKAN PB A (MULAI)"
                      : "HENTIKAN PROSES"}
                  </button>
                </div>
              </div>

              {/* KPI Grid sesuai Flowchart */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GradientCard
                  title="Suhu Pembacaan Sensor"
                  value={metrics.temp.toFixed(1)}
                  unit="°C"
                  icon={<Thermometer size={24} />}
                  color="from-orange-400 to-orange-600 dark:from-orange-500 dark:to-red-600"
                  alert={metrics.temp > 42}
                />
                <GradientCard
                  title="Output AC Dimmer"
                  value={metrics.dimmer}
                  unit="%"
                  icon={<Zap size={24} />}
                  color="from-purple-500 to-purple-700 dark:from-indigo-500 dark:to-purple-600"
                  alert={metrics.dimmer > 95}
                />
                <GradientCard
                  title="Progress Fermentasi"
                  value={Math.floor(metrics.days)}
                  unit={`/ ${TARGET_DAYS} Hari`}
                  icon={<Clock size={24} />}
                  color="from-blue-400 to-blue-600 dark:from-blue-500 dark:to-cyan-600"
                />
              </div>

              {/* Grafik Thermal */}
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Thermal & Output Analytics
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Pemantauan keseimbangan Suhu dan persentase kerja AC Dimmer.
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
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartColors.tooltipBg,
                          backdropFilter: "blur(10px)",
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          borderRadius: "16px",
                          color: chartColors.tooltipText,
                        }}
                      />

                      <ReferenceLine
                        yAxisId="left"
                        y={TARGET_TEMP}
                        stroke="#f97316"
                        strokeDasharray="5 5"
                        label={{
                          position: "insideTopLeft",
                          value: `SETPOINT: ${TARGET_TEMP}°C`,
                          fill: "#f97316",
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
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="right"
                        type="stepAfter"
                        dataKey="dimmer"
                        name="AC Dimmer (%)"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA & LOGS */}
          {activeTab === "logs" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TableProperties size={20} className="text-blue-500" /> Data
                    Historis
                  </h3>
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
                      className="text-xs flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/20 px-4 py-2 rounded-xl ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 transition font-bold text-emerald-600"
                    >
                      <Download size={14} /> CSV
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        <th className="p-4 font-semibold">Waktu</th>
                        <th className="p-4 font-semibold">Suhu (°C)</th>
                        <th className="p-4 font-semibold">Dimmer (%)</th>
                        <th className="p-4 font-semibold">Hari Ke-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...displayTableData].reverse().map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm"
                        >
                          <td className="p-4 font-mono">{row.time}</td>
                          <td className="p-4">{row.temperature.toFixed(2)}</td>
                          <td className="p-4">{row.dimmer}</td>
                          <td className="p-4">{Math.floor(row.days)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayTableData.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      Menunggu data sensor...
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg shadow-slate-200/40 dark:shadow-none flex flex-col h-[600px]">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                  <ShieldAlert
                    size={20}
                    className={
                      isEStop
                        ? "text-rose-500 animate-pulse"
                        : "text-emerald-500"
                    }
                  />{" "}
                  System Sequence Log
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Pencatatan tahapan Diagram Alir.
                </p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-4 rounded-2xl ring-1 ${alarm.type === "CRITICAL" ? "bg-rose-50 dark:bg-rose-500/10 ring-rose-200 dark:ring-rose-500/30" : alarm.type === "SUCCESS" ? "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30" : "bg-slate-50 dark:bg-slate-800/40 ring-slate-100 dark:ring-white/5"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {alarm.type === "WARNING" && (
                            <AlertTriangle
                              size={16}
                              className="text-amber-500"
                            />
                          )}
                          {alarm.type === "CRITICAL" && (
                            <AlertOctagon size={16} className="text-rose-600" />
                          )}
                          {alarm.type === "INFO" && (
                            <CheckCircle2 size={16} className="text-blue-500" />
                          )}
                          {alarm.type === "SUCCESS" && (
                            <CheckCircle2
                              size={16}
                              className="text-emerald-500"
                            />
                          )}
                          <span
                            className={`text-xs font-bold tracking-wider ${alarm.type === "WARNING" ? "text-amber-600" : alarm.type === "CRITICAL" ? "text-rose-600" : alarm.type === "SUCCESS" ? "text-emerald-600" : "text-blue-600"}`}
                          >
                            {alarm.type}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {alarm.time}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${alarm.type === "CRITICAL" ? "text-rose-700 font-medium" : alarm.type === "SUCCESS" ? "text-emerald-700 font-medium dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}
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

function GradientCard({ title, value, unit, icon, color, alert = false }: any) {
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
