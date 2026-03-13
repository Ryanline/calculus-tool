function clampY(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-10, Math.min(10, value));
}

function buildPath(points, width, height) {
  if (!points.length) {
    return "";
  }

  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = -12;
  const maxY = 12;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY;

  return points
    .map((point, index) => {
      const x = ((point.x - minX) / spanX) * width;
      const y = height - ((clampY(point.y) - minY) / spanY) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function GraphPanel({ title, expression, color, points }) {
  const width = 280;
  const height = 280;
  const path = buildPath(points, width, height);

  return (
    <article className="graph-card">
      <h2 style={{ color }}>{title}</h2>
      <p className="expression-label" style={{ color }}>
        {expression || "\u00A0"}
      </p>
      <div className="graph-box">
        <svg viewBox={`0 0 ${width} ${height}`} className="graph-svg" aria-label={`${title} graph`}>
          {Array.from({ length: 17 }).map((_, index) => {
            const position = (index / 16) * width;
            const className = index === 8 ? "axis-line" : "grid-line";

            return (
              <g key={index}>
                <line x1={position} y1="0" x2={position} y2={height} className={className} />
                <line x1="0" y1={position} x2={width} y2={position} className={className} />
              </g>
            );
          })}
          {path ? <path d={path} className="plot-line" style={{ stroke: color }} /> : null}
        </svg>
      </div>
    </article>
  );
}
