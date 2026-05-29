"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Code, 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  Key, 
  LineChart
} from "lucide-react";

const navItems = [
  { name: "Acquisition Console", href: "/", icon: LayoutDashboard },
  { name: "Incoming Webhooks", href: "/webhooks", icon: Terminal }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel border-r border-gray-800/80 min-h-screen fixed left-0 top-0 z-20 flex flex-col justify-between py-6">
      <div>
        {/* Brand Header */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">QuantFlow</h1>
            <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Real Estate OS</span>
          </div>
        </div>


        {/* Navigation items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                  isActive 
                    ? "bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500" 
                    : "text-gray-400 hover:bg-gray-800/35 hover:text-gray-200"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-200"
                }`} />
                {item.name}
                
                {/* Micro-hover glow circle on active */}
                {isActive && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full glow-purple"></span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">
        Offline Node V1.0.0
      </div>
    </aside>
  );
}
