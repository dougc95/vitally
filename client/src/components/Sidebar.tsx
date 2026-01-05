import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Activity,
  Target,
  LineChart,
  PlusCircle,
  LogOut,
  UploadCloud
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Add Metrics", href: "/measurements/new", icon: PlusCircle },
  { name: "Analytics", href: "/metrics", icon: LineChart },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Import Data", href: "/import", icon: UploadCloud },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  // Generate initials from user name or email
  const getInitials = () => {
    if (!user) return "?";
    if (user.firstName) {
      const first = user.firstName.charAt(0).toUpperCase();
      const last = user.lastName ? user.lastName.charAt(0).toUpperCase() : "";
      return first + last;
    }
    return user.email?.charAt(0).toUpperCase() || "?";
  };

  // Get display name
  const getDisplayName = () => {
    if (!user) return "User";
    if (user.firstName) {
      return `${user.firstName} ${user.lastName || ""}`.trim();
    }
    return user.email || "User";
  };

  return (
    <div className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            Vitally
          </span>
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-border/50 space-y-3">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{getDisplayName()}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => logout()}
          disabled={isLoggingOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md pb-safe z-50">
      <div className="flex justify-around items-center p-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current/20")} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
