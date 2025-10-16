import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  showAnomalies?: boolean;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  className = "",
  showAnomalies = true,
}: SparklineProps) {
  const { points, anomalyIndices, min, max } = useMemo(() => {
    if (!data.length) return { points: "", anomalyIndices: [], min: 0, max: 0 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Calculate mean and standard deviation for anomaly detection
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2 * stdDev; // 2 sigma threshold

    const anomalyIndices: number[] = [];
    const points = data
      .map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        // Detect anomalies (values > 2 standard deviations above mean)
        if (showAnomalies && value > threshold && value > mean * 1.5) {
          anomalyIndices.push(i);
        }
        
        return `${x},${y}`;
      })
      .join(" ");

    return { points, anomalyIndices, min, max };
  }, [data, width, height, showAnomalies]);

  if (!data.length) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkline-gradient)"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* Anomaly dots */}
      {showAnomalies && anomalyIndices.map((idx) => {
        const x = (idx / (data.length - 1)) * width;
        const value = data[idx];
        const y = height - ((value - min) / (max - min || 1)) * height;
        
        return (
          <g key={idx}>
            {/* Pulse ring */}
            <circle
              cx={x}
              cy={y}
              r="4"
              fill="none"
              stroke="rgb(234, 179, 8)"
              strokeWidth="1"
              opacity="0.4"
            >
              <animate
                attributeName="r"
                from="4"
                to="8"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.4"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Dot */}
            <circle
              cx={x}
              cy={y}
              r="2.5"
              fill="rgb(234, 179, 8)"
              stroke="rgb(253, 224, 71)"
              strokeWidth="1"
            />
          </g>
        );
      })}
    </svg>
  );
}
