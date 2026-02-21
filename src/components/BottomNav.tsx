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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.to || 
            (tab.to !== "/" && location.pathname.startsWith(tab.to));
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative flex flex-col items-center justify-center w-16 h-full gap-0.5"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full gradient-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <tab.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
