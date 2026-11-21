import type { Shape } from "../schema";

export function ArrowDetails({ shape }: { shape: Shape }) {
  const lenght = Math.hypot(shape.width, shape.height);

  if (lenght < 1) return null;

  const ux = shape.width / lenght;
  const uy = shape.height / lenght;

  const size = Math.min(Math.max(10, shape.strokeWidth * 3), lenght * 0.45);

  const backX = shape.width - ux * size;
  const backY = shape.height - uy * size;

  const leftX = backX - uy * size * 0.5;
  const leftY = backY + ux * size * 0.5;

  const rightX = backX + uy * size * 0.5;
  const rightY = backY - ux * size * 0.5;

  return (
    <>
      <polyline
        points={`${leftX},${leftY} ${shape.width},${shape.height} ${rightX},${rightY}`}
        fill="none"
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
      />

      {shape.text && (
        <text
          x={shape.width / 2}
          y={shape.height / 2 - 10}
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
          fontSize={14}
          fill={shape.color}
          stroke="white"
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={{
            userSelect: "none",
          }}
        >
          {shape.text}
        </text>
      )}
    </>
  );
}
