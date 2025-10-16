import { useMemo, useId } from "react";

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
  const uniqueId = useId();
  const { points, anomalyIndices, min, max, chartTop, chartBottom, chartHeight } = useMemo(() => {
    if (!data.length) return { points: "", anomalyIndices: [], min: 0, max: 0, chartTop: 0, chartBottom: height, chartHeight: height };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Vertical padding to avoid clipping line/dots
    const paddingY = Math.min(10, Math.max(4, Math.round(height * 0.15)));
    const chartTop = paddingY;
    const chartBottom = height - paddingY;
    const chartHeight = Math.max(1, chartBottom - chartTop);

    // Calculate mean and standard deviation for anomaly detection
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2 * stdDev; // 2 sigma threshold

    const anomalyIndices: number[] = [];

    // Handle single-point case to avoid NaN x positions
    if (data.length === 1) {
      const value = data[0];
      const y = chartBottom - ((value - min) / range) * chartHeight;
      const points = `0,${y} ${width},${y}`; // draw a horizontal line across
      // Single point can be considered an anomaly check
      if (showAnomalies && value > threshold && value > mean * 1.5) {
        anomalyIndices.push(0);
      }
      return { points, anomalyIndices, min, max, chartTop, chartBottom, chartHeight };
    }

    const points = data
      .map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = chartBottom - ((value - min) / range) * chartHeight;
        
        // Detect anomalies (values > 2 standard deviations above mean)
        if (showAnomalies && value > threshold && value > mean * 1.5) {
          anomalyIndices.push(i);
        }
        
        return `${x},${y}`;
      })
      .join(" ");

    return { points, anomalyIndices, min, max, chartTop, chartBottom, chartHeight };
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
        <linearGradient id={`sparkline-gradient-${uniqueId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        
        {/* Horizontal fade mask for left/right edges */}
        <linearGradient id={`sparkline-fade-mask-${uniqueId}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="5%" stopColor="white" stopOpacity="1" />
          <stop offset="95%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        
        <mask id={`sparkline-mask-${uniqueId}`}>
          <rect width="100%" height="100%" fill={`url(#sparkline-fade-mask-${uniqueId})`} />
        </mask>
      </defs>

      {/* Fill area */}
      <polygon
        points={`0,${chartBottom} ${points} ${width},${chartBottom}`}
        fill={`url(#sparkline-gradient-${uniqueId})`}
        mask={`url(#sparkline-mask-${uniqueId})`}
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
        mask={`url(#sparkline-mask-${uniqueId})`}
      />

      {/* Live indicator dot at the end */}
      {(() => {
        const lastIdx = data.length - 1;
        const lastValue = data[lastIdx];
        const lastX = data.length === 1 ? width / 2 : (lastIdx / (data.length - 1)) * width;
        const lastY = chartBottom - ((lastValue - min) / (Math.max(1, max - min))) * chartHeight;
        
        const dotR = Math.max(2.5, Math.round(height * 0.05));
        const ringStart = Math.max(dotR + 2, Math.round(height * 0.1));
        const ringEnd = Math.max(ringStart + 4, Math.round(height * 0.2));
        
        return (
          <g>
            {/* Pulse ring */}
            <circle
              cx={lastX}
              cy={lastY}
              r={ringStart}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.5"
            >
              <animate
                attributeName="r"
                from={ringStart}
                to={ringEnd}
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.5"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Live dot */}
            <circle
              cx={lastX}
              cy={lastY}
              r={dotR}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.9"
            />
          </g>
        );
      })()}

      {/* Anomaly dots */}
      {showAnomalies && (
        <g mask={`url(#sparkline-mask-${uniqueId})`}>
          {(() => {
            const dotR = Math.max(2, Math.round(height * 0.04));
            const ringStart = Math.max(dotR + 1, Math.round(height * 0.08));
            const ringEnd = Math.max(ringStart + 2, Math.round(height * 0.16));
            return anomalyIndices.map((idx) => {
            const x = (idx / (data.length - 1)) * width;
            const value = data[idx];
            const y = chartBottom - ((value - min) / (Math.max(1, max - min))) * chartHeight;
            
            return (
              <g key={idx}>
                {/* Pulse ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={ringStart}
                  fill="none"
                  stroke="rgb(234, 179, 8)"
                  strokeWidth="1"
                  opacity="0.4"
                >
                  <animate
                    attributeName="r"
                    from={ringStart}
                    to={ringEnd}
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
                  r={dotR}
                  fill="rgb(234, 179, 8)"
                  stroke="rgb(253, 224, 71)"
                  strokeWidth="1"
                />
              </g>
            );
            });
          })()}
        </g>
      )}
    </svg>
  );
}
