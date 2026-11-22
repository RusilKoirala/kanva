"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { KeyboardEvent, PointerEvent } from "react";

import { getBounds } from "../schema";

import type { Point, Shape } from "../schema";
import type { useWhiteboard } from "./use-whiteboard";

import type { useWhiteboardExtras } from "./use-whiteboard-extras";

type BoardApi = ReturnType<typeof useWhiteboard>;
type ExtrasApi = ReturnType<typeof useWhiteboardExtras>;

export type SelectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Gesture =
  | {
      mode: "box";
      pointerId: number;
      start: Point;
      initialIds: string[];
    }
  | {
      mode: "move";
      pointerId: number;
      start: Point;
      ids: string[];
      base: Shape[];
      latest: Shape[];
    };

function getPoint(event: PointerEvent<SVGSVGElement>): Point | null {
  const matrix = event.currentTarget.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return {
    x: point.x,
    y: point.y,
  };
}

function makeBox(start: Point, end: Point): SelectionBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function intersects(a: SelectionBox, b: SelectionBox) {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

export function useMultiSelect(board: BoardApi, extras: ExtrasApi) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [preview, setPreview] = useState<Shape[] | null>(null);
  const [marquee, setMarquee] = useState<SelectionBox | null>(null);

  const gesture = useRef<Gesture | null>(null);
  const latest = useRef({ board, extras });
  latest.current = { board, extras };

  const candidates = ids ?? (board.selectedId ? [board.selectedId] : []);

  const selectedIds =
    board.tool === "select"
      ? candidates.filter((id) => board.shapes.some((shape) => shape.id === id))
      : [];

  const element = preview ?? extras.elements;
  const cancel = useCallback(() => {
    gesture.current = null;
    setPreview(null);
    setMarquee(null);
    latest.current.extras.setExternalGesture(false);
  }, []);

  useEffect(() => {
    cancel();
    setIds(null);
  }, [extras.library.activeId, cancel]);

  useEffect(() => {
    if (board.tool !== "select") {
      cancel();
      setIds(null);
    }
  }, [board.tool, cancel]);

  function selectIds(next: string[]) {
    const unique = Array.from(new Set(next));

    setIds(unique);
    board.selectShape(unique.length === 1 ? unique[0] : null);
  }

  function selectOnly(id: string) {
    cancel();
    setIds(null);
    board.selectShape(id);
  }

  function clearSelection() {
    cancel();
    setIds(null);
    board.selectShape(null);
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (gesture.current) return;

    const handle = (event.target as Element).closest("[data-corner]");

    const emptySpace = !(event.target as Element).closest(
      "[data-shape-id], [data-corner]",
    );

    if (
      event.button !== 0 ||
      !event.isPrimary ||
      board.tool !== "select" ||
      extras.editing ||
      extras.isSpaceDown() ||
      handle ||
      (emptySpace && !event.shiftKey)
    ) {
      extras.onPointerDown(event);
      return;
    }

    const point = getPoint(event);
    if (!point) return;

    const target = (event.target as Element).closest("[data-shape-id]");

    const id = target?.getAttribute("data-shape-id");
    const hit = board.shapes.find((shape) => shape.id === id);

    if (hit && event.shiftKey) {
      event.preventDefault();
      event.currentTarget.focus();

      selectIds(
        selectedIds.includes(hit.id)
          ? selectedIds.filter((id) => id !== hit.id)
          : [...selectedIds, hit.id],
      );

      return;
    }

    if (hit && selectedIds.length > 1 && selectedIds.includes(hit.id)) {
      event.preventDefault();
      event.currentTarget.focus();

      gesture.current = {
        mode: "move",
        pointerId: event.pointerId,
        start: point,
        ids: selectedIds,
        base: board.shapes,
        latest: board.shapes,
      };

      board.selectShape(null);
      extras.setExternalGesture(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (!hit) {
      event.preventDefault();
      event.currentTarget.focus();

      const initialIds = event.shiftKey ? selectedIds : [];

      gesture.current = {
        mode: "box",
        pointerId: event.pointerId,
        start: point,
        initialIds,
      };

      selectIds(initialIds);

      setMarquee(makeBox(point, point));

      extras.setExternalGesture(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    setIds(null);
    extras.onPointerDown(event);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;

    if (!active) {
      extras.onPointerMove(event);
      return;
    }

    if (active.pointerId !== event.pointerId) return;

    const point = getPoint(event);

    if (!point) return;

    if (active.mode === "box") {
      const box = makeBox(active.start, point);
      setMarquee(box);

      const touched = board.shapes
        .filter((shape) => intersects(box, getBounds(shape)))
        .map((shape) => shape.id);

      selectIds([...active.initialIds, ...touched]);
      return;
    }

    const dx = point.x - active.start.x;
    const dy = point.y - active.start.y;

    active.latest = active.base.map((shape) =>
      active.ids.includes(shape.id)
        ? {
            ...shape,
            x: shape.x + dx,
            y: shape.y + dy,
          }
        : shape,
    );
    setPreview(active.latest);
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;

    if (!active) {
      extras.onPointerUp(event);
      return;
    }

    if (active.pointerId !== event.pointerId) return;

    onPointerMove(event);

    if (active.mode === "move") {
      board.commit(active.latest);
    }

    cancel();
  }

  function onLostPointerCapture(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;

    if (active) {
      if (active.pointerId !== event.pointerId) return;

      if (active.mode === "move") {
        board.commit(active.latest);
      }

      cancel();
    }

    extras.onLostPointerCapture(event);
  }

  function onPointerCancel(event?: PointerEvent<SVGSVGElement>) {
    if (event) {
      onLostPointerCapture(event);
      return;
    }

    const active = gesture.current;

    if (active?.mode === "box") {
      selectIds(active.initialIds);
    }

    cancel();
    extras.onPointerCancel();
  }

  function duplicateSelection() {
    if (!selectedIds.length || extras.editing) return;

    const copies = board.shapes
      .filter((shape) => selectedIds.includes(shape.id))
      .map((shape) => ({
        ...shape,
        id: crypto.randomUUID(),
        x: shape.x + 24,
        y: shape.y + 24,
      }));

    if (board.shapes.length + copies.length > 1000) {
      board.setNotice("this would exceed the 1000 shape limit i kept");
      return;
    }

    board.commit([...board.shapes, ...copies]);
    selectIds(copies.map((shape) => shape.id));
  }

  function deleteSelection() {
    if (!selectedIds.length || extras.editing) return;

    cancel();

    board.commit(
      board.shapes.filter((shape) => !selectedIds.includes(shape.id)),
    );

    setIds(null);
    board.selectShape(null);
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (extras.editing) return;

    const key = event.key.toLocaleLowerCase();
    const command = event.ctrlKey || event.metaKey;

    if (command && key === "a") {
      event.preventDefault();
      cancel();
      extras.changeTool("select");
      selectIds(board.shapes.map((shape) => shape.id));
      return;
    }

    if (command && key === "d" && selectedIds.length) {
      event.preventDefault();
      cancel();
      duplicateSelection();
      return;
    }

    if (
      !command &&
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedIds.length
    ) {
      event.preventDefault();
      deleteSelection();
      return;
    }

    if (event.key === "Escape" || (command && (key === "z" || key === "y"))) {
      cancel();
    }

    if (event.key === "Escape") {
      setIds(null);
    }

    extras.onKeyDown(event);
  }

  return {
    element,
    selectedIds,
    marquee,
    selectOnly,
    clearSelection,
    duplicateSelection,
    deleteSelection,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
  };
}
