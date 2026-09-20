interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ values, color, width = 86, height = 32 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const low = min === max ? min - 1 : min;
  const high = min === max ? max + 1 : max;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - 4 - ((value - low) / (high - low)) * (height - 8),
  }));

  const line = points
    .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const area = `M0 ${height} L${points
    .map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" L")} L${width} ${height} Z`;
  const gradientId = `spark-${color.replace("#", "")}`;
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.35} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.4} />
      <circle cx={last.x} cy={last.y} r={2.2} fill={color} />
    </svg>
  );
}

interface DonutSlice {
  count: number;
  color: string;
}

interface DonutChartProps {
  total: number;
  slices: DonutSlice[];
}

export function DonutChart({ total, slices }: DonutChartProps) {
  let start = 0;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {slices.map((slice, index) => {
        const fraction = slice.count / total;
        const length = Math.max(0, fraction * 100 - 1.2);
        const dashOffset = -start;
        start += fraction * 100;

        return (
          <circle
            key={index}
            cx={50}
            cy={50}
            r={44}
            fill="none"
            stroke={slice.color}
            strokeWidth={15}
            pathLength={100}
            strokeDasharray={`${length.toFixed(2)} ${(100 - length).toFixed(2)}`}
            strokeDashoffset={dashOffset.toFixed(2)}
            opacity={0.95}
          />
        );
      })}
    </svg>
  );
}

interface TrendChartProps {
  util: number[];
  vmem: number[];
}

export function TrendChart({ util, vmem }: TrendChartProps) {
  const width = 600;
  const height = 240;
  const padLeft = 30;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 18;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const pointCount = Math.max(util.length, vmem.length);
  const x = (index: number) =>
    padLeft + (pointCount > 1 ? (index / (pointCount - 1)) * innerWidth : innerWidth / 2);
  const y = (value: number) =>
    padTop + (1 - Math.max(0, Math.min(100, value)) / 100) * innerHeight;

  const linePath = (series: number[]) =>
    series
      .map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
      .join(" ");
  const areaPath = (series: number[]) =>
    `${linePath(series)} L${x(series.length - 1).toFixed(1)} ${(padTop + innerHeight).toFixed(
      1,
    )} L${x(0).toFixed(1)} ${(padTop + innerHeight).toFixed(1)} Z`;

  const lastIndex = pointCount - 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {[0, 25, 50, 75, 100].map((value) => (
        <line
          key={value}
          x1={padLeft}
          y1={y(value)}
          x2={width - padRight}
          y2={y(value)}
          stroke="rgba(0,190,255,0.12)"
          strokeWidth={1}
        />
      ))}
      {[0, 25, 50, 75, 100].map((value) => (
        <text key={value} x={2} y={y(value) + 3} fill="#4f7fae" fontSize={9}>
          {value}
        </text>
      ))}
      {util.length > 1 && (
        <>
          <defs>
            <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#00d9ff" stopOpacity={0.3} />
              <stop offset="1" stopColor="#00d9ff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gVmem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9a6bff" stopOpacity={0.18} />
              <stop offset="1" stopColor="#9a6bff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath(util)} fill="url(#gUtil)" />
          <path d={linePath(vmem)} fill="none" stroke="#9a6bff" strokeWidth={1.6} opacity={0.85} />
          <path d={linePath(util)} fill="none" stroke="#00d9ff" strokeWidth={2} />
          <circle cx={x(lastIndex)} cy={y(util[lastIndex])} r={3} fill="#fff" />
          <circle cx={x(lastIndex)} cy={y(util[lastIndex])} r={6} fill="none" stroke="#00d9ff" opacity={0.5} />
          <circle cx={x(lastIndex)} cy={y(vmem[lastIndex])} r={2.6} fill="#9a6bff" />
        </>
      )}
    </svg>
  );
}