"use client";

import { ShapeView } from "@/features/whiteboard/components/shape";
import { Toolbar } from "@/features/whiteboard/components/toolbar";
import { useWhiteboard } from "@/features/whiteboard/hooks/use-whiteboard";
import { getBounds } from "@/features/whiteboard/schema";
import { Barcode } from "lucide-react";
import { event } from "next/dist/build/output/log";
import { useRef } from "react";
import { file } from "zod";

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], {
    type: mimeType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Whiteboard() {
  const board = useWhiteboard();

  const fileButton = "";
  const canvasRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = board.elements.find(
    (shape) => shape.id === board.selectedId,
  );

  const bounds = selected ? getBounds(selected) : null;

  function exportJson() {
    download(
      JSON.stringify({ version: 1, elements: board.shapes }, null, 2),
      "kanva.json",
      "application/json",
    );
  }

  function exportSvg() {
    const original = canvasRef.current;
    if (!original) return;

    const clone = original.cloneNode(true) as SVGSVGElement;

    clone
      .querySelectorAll("[data-selection]")
      .forEach((element) => element.remove);

    clone.removeAttribute("class");

    clone.removeAttribute("style");

    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    clone.setAttribute("width", "1600");
    clone.setAttribute("height", "1000");

    download(
      new XMLSerializer().serializeToString(clone),
      "kanva.svg",
      "image/svg+xsml",
    );

    board.setNotice("drawing exported as svg :D");
  }

  if (!board.ready) {
    return (
      <main className="grid h-dvh place-items-center bg-stone-50 text-sm text-stone-500">
        Opening pleaseee waitt 1 sec
      </main>
    );
  }

  return (
    <main className="flex h-dvh min-h-[420px] flex-col bg-white text-stone-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black tracking-tight">
            Kanva<span className="text-violet-600">+</span>
          </h1>

          <span className="hidden text-xs text-stone-500 sm:inline">
            just a fun project for u cuttieee
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={fileButton}
            onClick={() => fileRef.current?.click()}
          >
            Open JSON
          </button>
          <button className={fileButton} onClick={exportJson}>
            Save JSON
          </button>
          <button className={fileButton} onClick={exportSvg}>
            EXport SVG
          </button>
        </div>

        <input
          ref={fileRef}
          type="type"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import drawing boii"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (!file) return;

            if (file.size > 2_000_000) {
              board.setNotice(
                "pls choose smaller json our system is very small for that (>2MB)",
              );
              return;
            }

            try {
              board.loadDocument(await file.text());
            } catch {
              board.setNotice("i cant read this file idk why :(");
            }
          }}
        />
      </header>

      <Toolbar
        tool={board.tool}
        color={board.color}
        strokeWidth={board.strokeWidth}
        canUndo={board.canUndo}
        canRedo={board.canRedo}
        onToolChange={board.setTool}
        onColorChange={board.changeColor}
        onStrokeWidthChange={board.changeStrokeWidth}
        onUndo={board.undo}
        onRedo={board.redo}
      />

      <section className="relative min-h-0 flex-1 overflow-hidden bg-stone-50">
        <svg
          ref={canvasRef}
          viewBox="0 0 1600 1800"
          tabIndex={0}
          aria-label="drawing area :D"
          className="block size-full bg-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
          style={{
            touchAction: "none",
            cursor:
              board.tool === "select"
                ? "default"
                : board.tool === "erase"
                  ? "not-allowed"
                  : "crosshair",
          }}
          onPointerDown={board.onpointerdown}
          onPointerMove={board.onpointermove}
          onPointerUp={board.onpointercancel}
          onPointerCancel={board.onpointercancel}
          onLostPointerCapture={board.onpointercancel}
          onKeyDown={board.onkeydown}
        >
          <defs>
            <pattern
              id="kanva-dots"
              width="24"
              height="24"
              patternUnits="useSpaceOnUse"
            >
              <circle cx="12" cy="12" r="1" fill="#d6d3d1" />
            </pattern>
          </defs>

          <rect width="1600" height="1000" fill="url(#kanva-dots" />

          {board.elements.map((shape) => {
            <ShapeView key={shape.id} shape={shape} />;
          })}

          {bounds && (
            <rect
              data-selection="true"
              x={bounds.x - 7}
              y={bounds.y - 7}
              width={bounds.width + 14}
              height={bounds.height + 14}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}
        </svg>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-500">
        <p role="status">{board.notice}</p>
        <p>Thanks for using a this amazinggg app</p>
      </footer>
    </main>
  );
}
