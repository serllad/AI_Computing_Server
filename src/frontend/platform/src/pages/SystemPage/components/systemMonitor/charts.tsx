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
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
      ))}
      {[0, 25, 50, 75, 100].map((value) => (
        <text key={value} x={2} y={y(value) + 3} fill="#94a3b8" fontSize={9}>
          {value}
        </text>
      ))}
      {util.length > 1 && (
        <>
          <defs>
            <linearGradient id="gUtil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2563eb" stopOpacity={0.28} />
              <stop offset="1" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gVmem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7c3aed" stopOpacity={0.16} />
              <stop offset="1" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath(util)} fill="url(#gUtil)" />
          <path d={linePath(vmem)} fill="none" stroke="#7c3aed" strokeWidth={1.6} opacity={0.85} />
          <path d={linePath(util)} fill="none" stroke="#2563eb" strokeWidth={2} />
          <circle cx={x(lastIndex)} cy={y(util[lastIndex])} r={3} fill="#fff" />
          <circle cx={x(lastIndex)} cy={y(util[lastIndex])} r={6} fill="none" stroke="#2563eb" opacity={0.5} />
          <circle cx={x(lastIndex)} cy={y(vmem[lastIndex])} r={2.6} fill="#7c3aed" />
        </>
      )}
    </svg>
  );
}
