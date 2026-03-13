import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppSidebar } from '@/components/AppSidebar';
import { TopBar } from '@/components/TopBar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <motion.div
        animate={{ marginLeft: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:block"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <div className="lg:transition-all lg:duration-200" style={{ marginLeft: collapsed ? 72 : 240 }}>
        <TopBar />
        <main className="p-4 md:p-6 max-w-[1600px]">
          {children}
        </main>
      </div>
      {/* Mobile: no margin */}
      <style>{`@media (max-width: 1023px) { .lg\\:transition-all { margin-left: 0 !important; } }`}</style>
    </div>
  );
}
