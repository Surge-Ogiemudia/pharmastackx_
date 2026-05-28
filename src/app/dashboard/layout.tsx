'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Activity, ShieldAlert, Menu, X, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useSession } from '@/context/SessionProvider';

const navigation = [
  { name: 'Global Network', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pharmacies', href: '/dashboard/pharmacies', icon: Users },
  { name: 'System Logs', href: '/dashboard/logs', icon: Activity },
  { name: 'Alerts', href: '/dashboard/alerts', icon: ShieldAlert },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication Guard
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden font-sans">
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : 0 }}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-900/50 border-b border-slate-800/50 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <span className="text-white font-bold text-xl leading-none">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Synkk Admin</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                  isActive ? "text-white bg-blue-500/10" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-blue-500/10 rounded-xl border border-blue-500/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon size={18} className={clsx("relative z-10", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800/50">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 bg-slate-900/30 backdrop-blur-md border-b border-slate-800/50 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-medium hidden sm:block text-slate-200">
              God Mode
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-sm font-medium text-slate-200">{user.name || 'Founder'}</span>
              <span className="text-xs text-blue-400 font-medium tracking-wider uppercase">Super Admin</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold border-2 border-slate-800 shadow-sm">
              S
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
