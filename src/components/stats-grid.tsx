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
    <div className="relative p-4 lg:p-5 group before:absolute before:inset-y-8 before:right-0 before:w-px before:bg-gradient-to-b before:from-input/30 before:via-input before:to-input/30 last:before:hidden">
      <div className="relative flex items-start gap-4 justify-between">
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
        {/* Sparkline - Right side on tablet and up */}
        <div className="hidden md:flex ml-auto items-center opacity-70 text-yellow-500 flex-none basis-[clamp(140px,28%,300px)] min-w-[120px] max-w-[320px]">
          <div className="w-full min-w-0">
            <Sparkline 
              data={sparklineData && sparklineData.length > 0 ? sparklineData : [0]} 
              height={60} 
              showAnomalies={false} 
              className="w-full h-auto" 
            />
          </div>
        </div>
      </div>
      {/* Sparkline - Bottom on mobile only */}
      <div className="md:hidden mt-3 -mb-1 opacity-60 text-yellow-500 w-full">
        <Sparkline 
          data={sparklineData && sparklineData.length > 0 ? sparklineData : [0]} 
          height={32} 
          showAnomalies={false} 
          className="w-full h-auto" 
        />
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
    <div className="grid grid-cols-2 min-[1200px]:grid-cols-4 border border-border rounded-xl bg-gradient-to-br from-sidebar/60 to-sidebar">
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} changeLabel={stat.changeLabel ?? periodLabel} showChange={showChange} />
      ))}
    </div>
  );
}
