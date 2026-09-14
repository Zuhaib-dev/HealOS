"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Server, 
  Database, 
  Activity, 
  Cpu, 
  MemoryStick, 
  Globe,
  Radio,
  Power
} from "lucide-react";
import { PanelHeader } from "../admin-shell";
import { useAuthStore } from "@/store/use-auth-store";

export function SystemHealthPanel() {
  const { token } = useAuthStore();
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      const res = await fetch(`${apiUrl}/system/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setHealthData(json.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 5000); // 5s Auto Refresh
    return () => clearInterval(interval);
  }, [token]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(0) + "MB";
  };

  return (
    <section className="pb-12 h-full flex flex-col">
      <PanelHeader
        index="ADM / 09"
        title="System Telemetry & Health"
        note="Live monitoring of servers and infrastructure integrations."
        actions={
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold">Auto-refresh (5s)</span>
          </div>
        }
      />
      
      <div className="flex-1 px-5 py-6 sm:px-8 space-y-6">
        {isLoading && !healthData ? (
          <div className="flex justify-center py-20">
            <Activity className="size-8 animate-pulse text-muted-foreground/50" />
          </div>
        ) : healthData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Database Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Database className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Database</h3>
                  <p className="text-xs text-muted-foreground">{healthData.database.host}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${healthData.database.status === 'Connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={`text-xs font-semibold ${healthData.database.status === 'Connected' ? 'text-emerald-500' : 'text-rose-500'}`}>{healthData.database.status}</span>
                </div>
              </div>
              
              <div className="mt-auto space-y-3">
                <div className="flex justify-between items-end border-t border-border/40 pt-4">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Storage Engine</span>
                  <span className="text-sm font-semibold text-foreground">Atlas Cloud</span>
                </div>
              </div>
            </motion.div>

            {/* Socket Engine Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Radio className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Socket Engine</h3>
                  <p className="text-xs text-muted-foreground">{healthData.sockets.gateway}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${healthData.sockets.status === 'Online' ? 'bg-cyan-500' : 'bg-rose-500'}`} />
                  <span className={`text-xs font-semibold ${healthData.sockets.status === 'Online' ? 'text-cyan-500' : 'text-rose-500'}`}>{healthData.sockets.status}</span>
                </div>
              </div>
              
              <div className="mt-auto space-y-3 border-t border-border/40 pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Active Channels</span>
                  <div className="flex items-center gap-2">
                    <Activity className="size-3.5 text-cyan-500" />
                    <span className="text-lg font-bold text-foreground leading-none">{healthData.sockets.activeChannels}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">Connected clients & drivers</p>
              </div>
            </motion.div>

            {/* App Process Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Power className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">App Process Uptime</h3>
                  <p className="text-xs text-muted-foreground">Next.js Server Process</p>
                </div>
              </div>
              
              <div className="mt-auto border-t border-border/40 pt-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Uptime</span>
                <span className="text-lg font-bold text-foreground font-mono tracking-tight text-amber-500">
                  {formatUptime(healthData.process.uptime)}
                </span>
              </div>
            </motion.div>

            {/* V8 Virtual Machine Memory */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-card/50 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <MemoryStick className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-500 font-semibold tracking-wider">MEM / 09</span>
                    <span className="size-1 rounded-full bg-border" />
                    <span className="text-xs text-muted-foreground">V8 Virtual Machine Memory</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">Memory Consumption</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto border-t border-border/40 pt-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heap Used vs Total</p>
                  <p className="text-sm font-semibold text-foreground font-mono">
                    {formatBytes(healthData.process.memory.heapUsed)} / {formatBytes(healthData.process.memory.heapTotal)}
                    <span className="text-purple-500 ml-1">
                      ({Math.round((healthData.process.memory.heapUsed / healthData.process.memory.heapTotal) * 100)}%)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">RSS Size</p>
                  <p className="text-sm font-semibold text-foreground font-mono">{formatBytes(healthData.process.memory.rss)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heap Committed</p>
                  <p className="text-sm font-semibold text-foreground font-mono">{formatBytes(healthData.process.memory.heapTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">External Allocations</p>
                  <p className="text-sm font-semibold text-foreground font-mono">{formatBytes(healthData.process.memory.external)}</p>
                </div>
              </div>
            </motion.div>

            {/* Environment Specs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Globe className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-blue-500 font-semibold tracking-wider">ENV / 09</span>
                    <span className="size-1 rounded-full bg-border" />
                    <span className="text-xs text-muted-foreground">Environment Specs</span>
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">System Specs</h3>
                </div>
              </div>

              <div className="space-y-4 mt-auto border-t border-border/40 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Node Version</span>
                  <span className="text-sm font-semibold font-mono">{healthData.environment.nodeVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Host OS Platform</span>
                  <span className="text-sm font-semibold font-mono">{healthData.environment.platform}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Mongoose Version</span>
                  <span className="text-sm font-semibold font-mono">v{healthData.environment.mongooseVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Next.js Framework</span>
                  <span className="text-sm font-semibold">{healthData.environment.nextjsVersion}</span>
                </div>
              </div>
            </motion.div>

          </div>
        ) : null}
      </div>
    </section>
  );
}
