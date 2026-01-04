import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Settings, 
  ToggleLeft, 
  MessageSquare, 
  Activity,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const SidebarItem = ({ 
  href, 
  icon: Icon, 
  label, 
  active,
  onClick
}: { 
  href: string; 
  icon: any; 
  label: string; 
  active: boolean;
  onClick?: () => void;
}) => (
  <Link href={href} className={`
    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
    ${active 
      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
      : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:pl-5"
    }
  `} onClick={onClick}>
    <Icon size={20} className={active ? "" : "group-hover:text-primary transition-colors"} />
    <span className="font-medium">{label}</span>
  </Link>
);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Overview" },
    { href: "/settings", icon: Settings, label: "General Settings" },
    { href: "/features", icon: ToggleLeft, label: "Features & Buttons" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/logs", icon: Activity, label: "Access Logs" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)}
          className="bg-card border-white/10"
        >
          {isOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/40
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight">MultififaIPTV</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <SidebarItem
                key={item.href}
                {...item}
                active={location === item.href}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </nav>

          <div className="pt-6 border-t border-border/40">
            <div className="bg-gradient-to-br from-card to-background border border-white/5 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">System Status</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-500">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 md:p-8 max-w-7xl mx-auto pb-20"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
