import { Link } from "wouter";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: "primary" | "secondary";
}

export function QuickAction({ title, description, icon: Icon, href, variant = "primary" }: QuickActionProps) {
  return (
    <Link href={href} className="block group">
      <div className={`
        h-full rounded-2xl p-6 border transition-all duration-300
        flex flex-col justify-between gap-4
        ${variant === "primary" 
          ? "bg-gradient-to-br from-primary to-blue-600 border-primary/20 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1" 
          : "bg-card border-border text-foreground hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
        }
      `}>
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          ${variant === "primary" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}
        `}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div>
          <h3 className={`font-bold text-lg mb-1 ${variant === "primary" ? "text-white" : "text-foreground"}`}>
            {title}
          </h3>
          <p className={`text-sm ${variant === "primary" ? "text-blue-100" : "text-muted-foreground"}`}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
