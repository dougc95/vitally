import { motion } from "framer-motion";

interface MacroRingProps {
  current: number;
  target: number;
  label: string;
  color: string;
  unit?: string;
  size?: "sm" | "md" | "lg";
}

export function MacroRing({
  current,
  target,
  label,
  color,
  unit = "g",
  size = "md",
}: MacroRingProps) {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const radius = size === "sm" ? 20 : size === "md" ? 34 : 45;
  const stroke = size === "sm" ? 3 : size === "md" ? 5 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const valClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative ${sizeClasses[size]} flex items-center justify-center`}
      >
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            className="text-muted/30"
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            className={color}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold font-mono ${valClasses[size]} ${color}`}>
            {Math.round(current)}
          </span>
          <span className={`text-muted-foreground text-[10px] leading-none`}>
            /{target}
            {unit}
          </span>
        </div>
      </div>
      <span
        className={`font-medium text-muted-foreground ${textClasses[size]}`}
      >
        {label}
      </span>
    </div>
  );
}
