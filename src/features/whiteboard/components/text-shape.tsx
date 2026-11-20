import type { Shape } from "../schema";
import { wrapText } from "../lib/geometry";

export function TextShape({ shape }: { shape: Shape }) {
  const note = shape.kind === "note";
  const size = shape.fontSize ?? 20;
  const padding = note ? 12 : 0;
  const lineHeight = size * 1.3;

  const lines = note
    ? wrapText(shape.text ?? "", Math.max(10, shape.width - padding * 2), size)
    : (shape.text ?? "").split("\n");

  const visibleLines = note
    ? lines.slice(
        0,
        Math.max(1, Math.floor(shape.height - padding * 2) / lineHeight),
      )
    : lines;

  return (
    <>
      <rect
        width={shape.width}
        height={shape.height}
        fill={note ? (shape.fill ?? "#fef08a") : "transparent"}
        stroke={note ? "#a8a29e" : "none"}
        strokeWidth={1}
      />

      <text
        x={padding}
        y={padding + size}
        fill={shape.color}
        fontFamily="Arial, sans-serif"
        fontSize={size}
        style={{ userSelect: "none" }}
      >
        {visibleLines.map((line, index) => (
          <tspan key={index} x={padding} dy={index === 0 ? 0 : lineHeight}>
            {line || "\u00a0"}
          </tspan>
        ))}
      </text>
    </>
  );
}
