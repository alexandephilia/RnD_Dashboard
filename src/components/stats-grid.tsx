import { RiArrowRightUpLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/sparkline";

interface StatsCardProps {
  title: string;
  value: string;
  change: {
    value: string;
    trend: "up" | "down";
  };
  icon: React.ReactNode;
  changeLabel?: string;
  showChange?: boolean;
  sparklineData?: number[];
}

export function StatsCard({ title, value, change, icon, changeLabel, showChange = true, sparklineData }: StatsCardProps) {
  const isPositive = change.trend === "up";
  const trendColor = isPositive ? "text-yellow-500" : "text-red-500";

  return (
    <div className="relative overflow-hidden p-3 sm:p-4 lg:p-5 group rounded-lg border border-dashed border-yellow-500/20 bg-card/60">
      {/* Subtle grid background with edge fades */}
      <div
        className="pointer-events-none absolute inset-0 rounded-lg text-foreground"
        style={{
          opacity: 0.01,
          backgroundImage:
            "repeating-linear-gradient(0deg,currentColor 0px,currentColor 1px,transparent 1px,transparent 14px),repeating-linear-gradient(90deg,currentColor 0px,currentColor 1px,transparent 1px,transparent 14px)",
          WebkitMaskImage:
            "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.25) 15%, rgba(0,0,0,.85) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,.85) 65%, rgba(0,0,0,.25) 85%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.25) 15%, rgba(0,0,0,.85) 35%, rgba(0,0,0,1) 50%, rgba(0,0,0,.85) 65%, rgba(0,0,0,.25) 85%, rgba(0,0,0,0) 100%)",
        }}
      />
      {/* Background sparkline layer */}
      {sparklineData && sparklineData.length >= 0 && (
        <div className="absolute inset-0 opacity-30 text-yellow-500/60 pointer-events-none overflow-hidden rounded-lg">
          <div className="w-full h-full flex items-center justify-end pr-4 lg:pr-5">
            <div className="w-[45%] max-w-[260px] h-full flex items-center">
              <Sparkline 
                data={sparklineData && sparklineData.length > 0 ? sparklineData : [0]} 
                showAnomalies={false} 
                className="w-full h-auto"
                rightInsetPx={8}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Foreground content */}
      <div className="relative flex items-start gap-4 z-10">
        <RiArrowRightUpLine
          className="absolute right-0 top-0 opacity-0 group-has-[a:hover]:opacity-100 transition-opacity text-yellow-500 z-10"
          size={20}
          aria-hidden="true"
          suppressHydrationWarning
        />
        {/* Icon */}
        <div className="max-[480px]:hidden size-10 shrink-0 rounded-full bg-yellow-600/25 border border-yellow-600/50 flex items-center justify-center text-yellow-500">
          {icon}
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <a
            href="#"
            className="font-medium tracking-widest text-xs uppercase text-muted-foreground/60 before:absolute before:inset-0"
          >
            {title}
          </a>
          <div className="text-2xl font-semibold mb-2">{value}</div>
          {showChange && (
            <div className="text-xs text-muted-foreground/60">
              <span className={cn("font-medium", trendColor)}>
                {isPositive ? "↗" : "↘"} {change.value}
              </span>{" "}
              {changeLabel ?? "in 24h"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: StatsCardProps[];
  periodLabel?: string;
  showChange?: boolean;
}

export function StatsGrid({ stats, periodLabel, showChange = true }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 min-[1200px]:grid-cols-4 gap-2 sm:gap-3 border border-border rounded-xl bg-card p-2 sm:p-3">
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} changeLabel={stat.changeLabel ?? periodLabel} showChange={showChange} />
      ))}
    </div>
  );
}
