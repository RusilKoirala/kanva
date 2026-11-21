"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, RefObject } from "react";

import type { Point, Shape, Tool } from "../schema";

import { fitText, resizeShape } from "../lib/geometry";

import type { Corner } from "../lib/geometry";

import type { useWhiteboard } from "./use-whiteboard";

import { useBoardLibrary } from "./use-board-library";

type BoardApi = ReturnType<typeof useWhiteboard>;

type View = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Editing = {
  shape: Shape;
  isNew: boolean;
};

type ExtraGesture =
  | {
      mode: "pan";
      pointerId: number;
      inverse: DOMMatrix;
      start: Point;
      view: View;
    }
  | {
      mode: "resize";
      pointerId: number;
      shape: Shape;
      corner: Corner;
      base: Shape[];
      latest: Shape[];
    };

const INITIAL_VIEW: View = {
  x: 0,
  y: 0,
  width: 1600,
  height: 1000,
};

function pointAt(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  const point = new DOMPoint(clientX, clientY).matrixTransform(
    matrix.inverse(),
  );

  return {
    x: point.x,
    y: point.y,
  };
}

export function useWhiteboardExtras(
  board: BoardApi,
  svgRef: RefObject<SVGSVGElement>,
) {
  const library = useBoardLibrary(board);

  const [view, setView] = useState<View>(INITIAL_VIEW);

  const viewRef = useRef(view);
  viewRef.current = view;

  const [preview, setPreview] = useState<Shape[] | null>(null);

  const [editing, setEditing] = useState<Editing | null>(null);
  const [fontSize, setFontSize] = useState(20);
  const [noteColor, setNoteColor] = useState("#fef08a");

  const gesture = useRef<ExtraGesture | null>(null);
  const forwardedPointer = useRef<number | null>(null);
  const spaceDown = useRef(false);

  const externalGesture = useRef(false);

  let elements = preview ?? board.elements;

  if (editing) {
    elements = editing.isNew
      ? [...elements, editing.shape]
      : elements.map((shape) =>
          shape.id === editing.shape.id ? editing.shape : shape,
        );
  }

  const selected = elements.find((shape) => shape.id === board.selectedId);

  const zoom = 1600 / view.width;

  useEffect(() => {
    setView(INITIAL_VIEW);
    setEditing(null);
    setPreview(null);
    gesture.current = null;
    forwardedPointer.current = null;
  }, [library.activeId]);

  useEffect(() => {
    function down(event: globalThis.KeyboardEvent) {
      if (event.code !== "Space") return;

      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, button, [contenteditable='true']",
        )
      ) {
        return;
      }

      event.preventDefault();
      spaceDown.current = true;
    }

    function up(event: globalThis.KeyboardEvent) {
      if (event.code === "Space") spaceDown.current = false;
    }

    function reset() {
      spaceDown.current = false;
    }

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !board.ready) return;

    function wheel(event: WheelEvent) {
      event.preventDefault();

      if (
        gesture.current ||
        forwardedPointer.current !== null ||
        externalGesture.current
      ) {
        return;
      }

      const point = pointAt(svg!, event.clientX, event.clientY);

      if (!point) return;

      const factor = Math.exp(
        Math.max(-100, Math.min(100, event.deltaY)) * 0.002,
      );

      setView((current) => {
        const width = Math.max(400, Math.min(8000, current.width * factor));

        const ratio = width / current.width;

        return {
          x: point.x - (point.x - current.x) * ratio,
          y: point.y - (point.y - current.y) * ratio,
          width,
          height: width * (1000 / 1600),
        };
      });
    }

    svg.addEventListener("wheel", wheel, { passive: false });

    return () => svg.removeEventListener("wheel", wheel);
  }, [board.ready, svgRef]);

  function applyEditing() {
    if (!editing) return;

    const shape = fitText(editing.shape);

    if (shape.kind === "text" && !shape.text?.trim()) {
      if (!editing.isNew) {
        board.commit(board.shapes.filter((item) => item.id !== shape.id));
      }

      setEditing(null);
      return;
    }

    board.commit(
      editing.isNew
        ? [...board.shapes, shape]
        : board.shapes.map((item) => (item.id === shape.id ? shape : item)),
    );

    board.selectShape(shape.id);
    setEditing(null);
  }

  function changeTool(tool: Tool) {
    if (editing) applyEditing();
    board.setTool(tool);
  }

  function changeText(text: string) {
    setEditing((current) =>
      current
        ? {
            ...current,
            shape: fitText({ ...current.shape, text }),
          }
        : null,
    );
  }

  function changeFontSize(value: number) {
    const next = Math.max(12, Math.min(72, value));

    setFontSize(next);

    if (editing) {
      setEditing({
        ...editing,
        shape: fitText({
          ...editing.shape,
          fontSize: next,
        }),
      });
    } else if (
      selected &&
      (selected.kind === "text" || selected.kind === "note")
    ) {
      board.commit(
        board.shapes.map((shape) =>
          shape.id === selected.id
            ? fitText({ ...shape, fontSize: next })
            : shape,
        ),
      );
    }
  }

  function changeNoteColor(fill: string) {
    setNoteColor(fill);

    if (editing?.shape.kind === "note") {
      setEditing({
        ...editing,
        shape: { ...editing.shape, fill },
      });
    } else if (selected?.kind === "note") {
      board.commit(
        board.shapes.map((shape) =>
          shape.id === selected.id ? { ...shape, fill } : shape,
        ),
      );
    }
  }

  function changeColor(color: string) {
    if (editing) {
      setEditing({
        ...editing,
        shape: { ...editing.shape, color },
      });
    } else {
      board.changeColor(color);
    }
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (
      !event.isPrimary ||
      gesture.current ||
      forwardedPointer.current !== null
    ) {
      return;
    }
    if (editing) return;

    const svg = event.currentTarget;

    if (event.button === 1 || (event.button === 0 && spaceDown.current)) {
      const matrix = svg.getScreenCTM();

      if (!matrix) return;

      event.preventDefault();
      svg.focus();

      const inverse = matrix.inverse();
      const start = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        inverse,
      );

      gesture.current = {
        mode: "pan",
        pointerId: event.pointerId,
        start: { x: start.x, y: start.y },
        inverse,
        view: { ...viewRef.current },
      };

      svg.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== 0) return;

    const point = pointAt(svg, event.clientX, event.clientY);

    if (!point) return;

    const handle = (event.target as Element).closest("[data-corner]");

    if (handle && selected && board.tool === "select") {
      event.preventDefault();
      svg.focus();

      gesture.current = {
        mode: "resize",
        pointerId: event.pointerId,
        corner: handle.getAttribute("data-corner") as Corner,
        shape: selected,
        base: board.shapes,
        latest: board.shapes,
      };

      svg.setPointerCapture(event.pointerId);
      return;
    }

    if (board.tool === "text" || board.tool === "note") {
      if (board.shapes.length >= 1000) {
        board.setNotice("this board has 1000 shapes");
        return;
      }

      event.preventDefault();

      const note = board.tool === "note";

      setEditing({
        isNew: true,
        shape: {
          id: crypto.randomUUID(),
          kind: note ? "note" : "text",
          x: point.x,
          y: point.y,
          width: note ? 220 : 160,
          height: note ? 180 : fontSize * 1.3,
          color: board.color,
          strokeWidth: board.strokeWidth,
          points: [],
          text: note ? "new note" : "",
          fontSize,
          fill: noteColor,
        },
      });

      board.setTool("select");
      return;
    }

    board.onPointerDown(event);

    if (svg.hasPointerCapture(event.pointerId)) {
      forwardedPointer.current = event.pointerId;
    }
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;

    if (!active) {
      board.onPointerMove(event);
      return;
    }

    if (active.pointerId !== event.pointerId) return;

    if (active.mode === "pan") {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        active.inverse,
      );

      setView({
        ...active.view,
        x: active.view.x - (point.x - active.start.x),
        y: active.view.y - (point.y - active.start.y),
      });

      return;
    }

    const point = pointAt(event.currentTarget, event.clientX, event.clientY);

    if (!point) return;

    const resized = resizeShape(
      active.shape,
      active.corner,
      point,
      event.shiftKey,
    );

    active.latest = active.base.map((shape) =>
      shape.id === resized.id ? resized : shape,
    );

    setPreview(active.latest);
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (active) {
      if (active.pointerId !== event.pointerId) return;

      onPointerMove(event);

      if (active.mode === "resize") {
        board.commit(active.latest);
      }

      gesture.current = null;
      setPreview(null);
      return;
    }
    board.onPointerUp(event);

    if (forwardedPointer.current === event.pointerId) {
      forwardedPointer.current = null;
    }
  }

  function cancelPointer() {
    gesture.current = null;
    forwardedPointer.current = null;
    setPreview(null);
    board.onPointerCancel();
  }

  function onDoubleClick(event: MouseEvent<SVGSVGElement>) {
    if (board.tool !== "select" || editing) return;

    const target = (event.target as Element).closest("[data-shape-id]");

    const id = target?.getAttribute("data-shape-id");

    const shape = board.shapes.find((item) => item.id === id);

    if (shape && (shape.kind === "text" || shape.kind === "note")) {
      setEditing({
        shape,
        isNew: false,
      });
    }
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.code === "Space") {
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      cancelPointer();
      setEditing(null);
    }

    board.onKeyDown(event);
  }

  return {
    library,
    elements,
    selected,
    editing,
    view,
    zoom,
    fontSize: editing?.shape.fontSize ?? selected?.fontSize ?? fontSize,
    noteColor: editing?.shape.fill ?? selected?.fill ?? noteColor,
    changeTool,
    changeText,
    changeFontSize,
    changeNoteColor,
    changeColor,
    applyEditing,
    cancelEditing: () => setEditing(null),
    resetView: () => setView(INITIAL_VIEW),

    isSpaceDown: () => spaceDown.current,
    isInteracting: () =>
      !!gesture.current ||
      forwardedPointer.current !== null ||
      externalGesture.current,

    setExternalGesture: (active: boolean) => {
      externalGesture.current = active;
    },

    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancelPointer,
    onDoubleClick,
    onKeyDown,
  };
}
