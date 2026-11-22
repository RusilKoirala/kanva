"use client";

import type { Shape } from "../schema";

import { supportsFill, supportsLineStyle } from "../lib/shape-style";

import type { StylePatch } from "../lib/shape-style";

type Props = {
  shapes: Shape[];
  disabled?: boolean;
  onChange: (patch: StylePatch) => void;
};

const colors = [
  "#292524",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

const inputClass = "border border-stone-300 bg-white px-2 py-1 text-xs";

export function StyleControls({ shapes, disabled = false, onChange }: Props) {
  const first = shapes[0];

  if (!first) {
    return (
      <p className="border-b border-stone-200 p-2 text-xs text-stone-500">
        Select an object to change its style
      </p>
    );
  }

  const coloredShape = shapes.find((shape) => shape.kind !== "image");

  const filledShape = shapes.find(supportsFill);
  const outlinedShape = shapes.find(supportsLineStyle);

  const opacity = Math.round((first.opacity ?? 1) * 100);

  const opacityOptions = Array.from(
    new Set([opacity, 100, 75, 50, 25, 10, 0]),
  ).sort((a, b) => b - a);

  return (
    <fieldset
      disabled={disabled}
      className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-2 text-xs disabled:opacity-50"
    >
      <span className="text-stone-500">Style * {shapes.length} selected</span>

      <label className="flex items-center gap-1">
        Stroke/ Text
        <input
          type="color"
          aria-label="selected object color"
          value={coloredShape?.color ?? "#292524"}
          disabled={!coloredShape}
          onChange={(event) => onChange({ color: event.target.value })}
          className="h-7 w-8 cursor-pointer border border-stone-300 disabled:opacity-30"
        />
      </label>

      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Quick colors"
      >
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use ${color} for stroke or text`}
            title={color}
            disabled={!coloredShape}
            onClick={() => onChange({ color })}
            className="h-5 w-5 border border-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-30"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <label className="flex items-center gap-1">
        Fill
        <input
          type="color"
          aria-label="Shape fill color"
          value={filledShape?.fill ?? "#fef08a"}
          disabled={!filledShape}
          onChange={(event) => onChange({ fill: event.target.value })}
          className="h-7 w-8 cursor-pointer border border border-stone-300 disabled:opacity-30"
        />
      </label>
      <button
        type="button"
        disabled={!filledShape}
        onClick={() => onChange({ fill: undefined })}
        className={`${inputClass} disabled:opacity-30`}
      >
        No fill
      </button>
      <label className="flex items-center gap-1">
        Opacity
        <select
          value={opacity}
          onChange={(event) =>
            onChange({
              opacity: Number(event.target.value) / 100,
            })
          }
          className={inputClass}
        >
          {opacityOptions.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        Line
        <select
          value={outlinedShape?.strokeStyle ?? "solid"}
          disabled={!outlinedShape}
          onChange={(event) =>
            onChange({
              strokeStyle: event.target.value as "solid" | "dashed" | "dotted",
            })
          }
          className={`${inputClass} disabled:opacity-30`}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </label>
      {shapes.length > 1 && (
        <span className="text-stone-500">
          value show the first applicable object
        </span>
      )}
    </fieldset>
  );
}
