"use client";

import { useMultiSelect } from "@/features/whiteboard/hooks/use-multi-select";
import { useImageImport } from "@/features/whiteboard/hooks/use-image-import";
import { SelectionOverlay } from "@/features/whiteboard/components/selection-overlay";

import { ShapeView } from "@/features/whiteboard/components/shape";
import { Toolbar } from "@/features/whiteboard/components/toolbar";
import { useWhiteboard } from "@/features/whiteboard/hooks/use-whiteboard";
import { getBounds } from "@/features/whiteboard/schema";
import { useRef, useState } from "react";
import { useWhiteboardExtras } from "@/features/whiteboard/hooks/use-whiteboard-extras";
import { ExtraControls } from "@/features/whiteboard/components/extra-controls";
import { makeSvg, savePng } from "@/features/whiteboard/lib/export-image";

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

  const contentRef = useRef<SVGGElement>(null);
  const extras = useWhiteboardExtras(board, canvasRef);

  const imageRef = useRef<HTMLInputElement>(null);

  const selection = useMultiSelect(board, extras);

  const images = useImageImport(board, extras, canvasRef, selection.selectOnly);

  const [resolution, setResolution] = useState<1 | 2>(1);
  const [transparent, setTransaprent] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selected = selection.element.find(
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

  async function exportPng() {
    const layer = contentRef.current;

    if (!layer) return;
    setExporting(true);
    try {
      await savePng(layer, selection.element, resolution, transparent);

      board.setNotice("png exported YAY");
    } catch (error) {
      board.setNotice("error in exporting png " + error);
    } finally {
      setExporting(false);
    }
  }

  function exportSvg() {
    const layer = contentRef.current;
    if (!layer) return;

    try {
      const svg = makeSvg(layer, selection.element, transparent);
      download(svg.source, "kanva.svg", "image/svg+xml");
      board.setNotice("drawing exported as svg :D");
    } catch (error) {
      board.setNotice("Error exporting svg " + error);
    }
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
          type="file"
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
        onToolChange={extras.changeTool}
        onColorChange={extras.changeColor}
        onStrokeWidthChange={board.changeStrokeWidth}
        onUndo={board.undo}
        onRedo={board.redo}
      />

      <ExtraControls
        extras={extras}
        tool={board.tool}
        resolution={resolution}
        transparent={transparent}
        exporting={exporting}
        onResolutionChange={setResolution}
        onTransparentChange={setTransaprent}
        onExport={exportPng}
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-2 text-xs">
        <button
          className="border border-stone-300 px-2 py-1"
          aria-pressed={board.tool === "arrow"}
          onClick={() => imageRef.current?.click()}
        >
          Arrow A
        </button>

        <button
          className="border border-stone-300 px-2 py-1 disabled:opacity-40"
          disabled={images.busy || !!extras.editing}
          onClick={() => imageRef.current?.click()}
        >
          {images.busy ? "Adding image..." : "Add image"}
        </button>

        <input
          ref={imageRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-label="Upload an image"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (file) void images.addFile(file);
          }}
        />

        <span className="text-stone-500">
          {selection.selectedIds.length} selected
        </span>

        <button
          className="border border-stone-300 px-2 py-1 disabled:opacity-40"
          disabled={!selection.selectedIds.length || !!extras.editing}
          onClick={selection.duplicateSelection}
        >
          Duplicate
        </button>

        <button
          className="border border-stone-300 px-2 py-1 disabled:opacity-40"
          disabled={!selection.selectedIds.length || !!extras.editing}
          onClick={selection.deleteSelection}
        >
          Delete Selected
        </button>

        <span className="text-stone-500">
          tip: shift-click or drag empty space to select
        </span>
      </div>

      <section className="relative min-h-0 flex-1 overflow-hidden bg-stone-50">
        <svg
          ref={canvasRef}
          viewBox={`${extras.view.x} ${extras.view.y} ${extras.view.width} ${extras.view.height}`}
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
          onPointerDown={extras.onPointerDown}
          onPointerMove={extras.onPointerMove}
          onPointerUp={extras.onPointerUp}
          onPointerCancel={extras.onPointerCancel}
          onLostPointerCapture={extras.onPointerCancel}
          onKeyDown={extras.onKeyDown}
          onDoubleClick={extras.onDoubleClick}
        >
          <defs>
            <pattern
              id="kanva-dots"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="12" cy="12" r="1" fill="#d6d3d1" />
            </pattern>
          </defs>

          <rect
            x={extras.view.x}
            y={extras.view.y}
            width={extras.view.width}
            height={extras.view.height}
            fill="url(#kanva-dots)"
          />

          <g ref={contentRef}>
            {extras.elements.map((shape) => (
              <ShapeView key={shape.id} shape={shape} />
            ))}
          </g>

          {bounds && !extras.editing && board.tool === "select" && (
            <g data-selection="true">
              <rect
                x={bounds.x}
                y={bounds.y}
                width={Math.max(1, bounds.width)}
                height={Math.max(1, bounds.height)}
                fill="none"
                stroke="#7c3aed"
                strokeWidth={1.5 / extras.zoom}
                strokeDasharray={`${6 / extras.zoom} ${4 / extras.zoom}`}
                pointerEvents="none"
              />

              {(["nw", "ne", "sw", "se"] as const).map((corner) => {
                const size = 12 / extras.zoom;
                const x = corner.endsWith("w")
                  ? bounds.x
                  : bounds.x + bounds.width;

                const y = corner.startsWith("n")
                  ? bounds.y
                  : bounds.y + bounds.height;

                return (
                  <rect
                    key={corner}
                    data-corner={corner}
                    x={x - size / 2}
                    y={y - size / 2}
                    width={size}
                    height={size}
                    fill="white"
                    stroke="#7c3aed"
                    strokeWidth={1 / 5 / extras.zoom}
                    style={{
                      cursor:
                        corner === "nw" || corner === "se"
                          ? "nwse-resize"
                          : "nesw-resize",
                    }}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {extras.editing && (
          <div className="absolute bottom-3 left-3 w-72 max-w-[90%] border border-stone-400 bg-white p-2 text-sm">
            <label className="block">
              {extras.editing.shape.kind === "note" ? "Sticky Note" : "text"}

              <textarea
                autoFocus
                rows={4}
                maxLength={5000}
                value={extras.editing.shape.text ?? ""}
                onChange={(event) => extras.changeText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    extras.cancelEditing();
                  }
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === "Enter"
                  ) {
                    extras.applyEditing();
                  }
                }}
                className="mt-1 block w-full resize-y border border-stone-300 p-1 text-stone-900"
              />
            </label>

            <div className="mt-2 flex gap-2">
              <button
                onClick={extras.applyEditing}
                className="border border-stone-400 px-2 py-1"
              >
                Apply
              </button>

              <button
                onClick={extras.cancelEditing}
                className="border border-stone-300 px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-4 py-2 text-xs text-stone-500">
        <p role="status">{board.notice}</p>
        <p>Thanks for using a this amazinggg app</p>
      </footer>
    </main>
  );
}
