import {
  Circle,
  Eraser,
  Icon,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import type { Tool } from "../schema";
import { buttonVariants } from "@/components/ui/button";
import { event } from "next/dist/build/output/log";

// yes i wrote all the tools :) , hi reviewer i appreciate u reading my awsome code
const tools = [
  {
    id: "select",
    label: "Select",
    key: "V",
    icon: MousePointer2,
  },

  {
    id: "pen",
    label: "Pen",
    key: "P",
    icon: Pencil,
  },
  {
    id: "rectangle",
    label: "Rectangle",
    key: "R",
    icon: Square,
  },

  {
    id: "ellipse",
    label: "Ellipse",
    key: "O",
    icon: Circle,
  },

  {
    id: "line",
    label: "Line",
    key: "L",
    icon: Minus,
  },

  {
    id: "erase",
    label: "Eraser",
    key: "E",
    icon: Eraser,
  },
] as const;

type Props = {
  tool: Tool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
};

// if u thinking why i wrote this freaking with concatenating cuz its easy to see each thing seperated like size on focus
const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-lg " +
  "transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-voilet-500 " +
  "disabled:cursor-not-allowed disabled:opacity-30";

export function Toolbar(props: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 border-b border-stone-200 bg-white px-3 py-3"
      aria-label="Drawing controls"
    >
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
        {tools.map(({ id, label, key, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={`${label} (${key})`}
            aria-label={`${label} (${key})`}
            aria-pressed={props.tool === id}
            onClick={() => props.onToolChange(id)}
            className={`${iconButton} ${
              props.tool === id
                ? "bg-violet-200 text-violet-950"
                : "text-stone-600 hover:bg-stone-200"
            }`}
          >
            <Icon size={19} />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 px-2">
        <label className="flex items-center gap-2 text-xs font-medium text-stone-500 ">
          Color
          <input
            type="color"
            aria-label="Stroke Color"
            value={props.color}
            onChange={(event) => props.onColorChange(event.target.value)}
            className="size-8 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-stone-500 ">
          Stroke
          <select
            aria-label="Stroke Width"
            value={props.strokeWidth}
            onChange={(event) =>
              props.onStrokeWidthChange(Number(event.target.value))
            }
            className="rounded-md border border-stone-200 bg-white px-2 py-2  text-sm text-stone-800"
          >
            <option value={2}>Thin</option>
            <option value={4}>Medium</option>
            <option value={8}>Thickk</option>
          </select>
        </label>
      </div>

      <div className="flex gap-1 border-l border-stone-200 pl-2">
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          disabled={!props.canUndo}
          onClick={props.onUndo}
          className={`${iconButton} text-stone-600 hover:bg-stone-100`}
        >
          <Undo2 size={19} />
        </button>

        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          disabled={!props.canRedo}
          onClick={props.onRedo}
          className={`${iconButton} text-stone-600 hover:bg-stone-100`}
        >
          <Redo2 size={19} />
        </button>
      </div>
    </div>
  );
}
