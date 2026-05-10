import type { ReactNode } from "react";

interface MetricTileProps {
  label: string;
  value: string | number;
  icon: ReactNode;
}

export function MetricTile({ label, value, icon }: MetricTileProps) {
  return (
    <article className="metric-tile">
      <div className="metric-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
