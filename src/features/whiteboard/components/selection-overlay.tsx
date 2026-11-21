import { getBounds } from "../schema";

import type { useMultiSelect } from "../hooks/use-multi-select";

type Props = {
  selection: ReturnType<typeof useMultiSelect>;
  zoom: number;
};

export function SelectionOverlay({ selection, zoom }: Props) {
  const selected =
    selection.selectedIds.length > 1
      ? selection.element.filter((shape) =>
          selection.selectedIds.includes(shape.id),
        )
      : [];

  return (
    <g data-selection="true" pointerEvents="none">
      {selected.map((shape) => {
        const bounds = getBounds(shape);

        return (
          <rect
            key={shape.id}
            x={bounds.x - 3}
            y={bounds.y - 3}
            width={bounds.width + 6}
            height={bounds.height + 6}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.5 / zoom}
          />
        );
      })}
      {selection.marquee && (
        <rect
          x={selection.marquee.x}
          y={selection.marquee.y}
          width={selection.marquee.width}
          height={selection.marquee.height}
          fill="#3563eb"
          fillOpacity={0.08}
          stroke="#2563eb"
          strokeWidth={1.5 / zoom}
          strokeDasharray={`${5 / zoom} ${4 / zoom}`}
        />
      )}
    </g>
  );
}
