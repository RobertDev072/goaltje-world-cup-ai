import { Home, Trophy, Users, GitBranch, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/matches", icon: Trophy, label: "Matches" },
  { to: "/pool", icon: Users, label: "Pool" },
  { to: "/bracket", icon: GitBranch, label: "Bracket" },
  { to: "/profile", icon: User, label: "Profiel" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-primary border-t border-primary-foreground/10">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.to || 
            (tab.to !== "/" && location.pathname.startsWith(tab.to));
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-secondary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-white" : "text-primary-foreground/60"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors truncate max-w-full",
                  isActive ? "text-white" : "text-primary-foreground/60"
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area spacer for iOS home indicator */}
      <div className="safe-bottom" />
    </nav>
  );
}
