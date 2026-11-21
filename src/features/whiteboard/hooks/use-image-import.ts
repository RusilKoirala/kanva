"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RefObject } from "react";
import { prepareImage } from "../lib/image-file";

import type { useWhiteboard } from "./use-whiteboard";
import type { useWhiteboardExtras } from "./use-whiteboard-extras";
import { Shape } from "../schema";

type BoardApi = ReturnType<typeof useWhiteboard>;
type ExtrasApi = ReturnType<typeof useWhiteboardExtras>;

export function useImageImport(
  board: BoardApi,
  extras: ExtrasApi,
  svgRef: RefObject<SVGSVGElement>,
  selectOnly: (id: string) => void,
) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const latest = useRef({
    board,
    extras,
    selectOnly,
    svgRef,
  });

  latest.current = { board, extras, selectOnly, svgRef };
  const addFile = useCallback(async (file: File) => {
    if (busyRef.current) return;

    const inital = latest.current;

    if (!inital.board.ready || !inital.extras.library.activeId) {
      inital.board.setNotice("wait for board to open u impatient cuttie");
      return;
    }

    if (inital.extras.editing || inital.extras.isInteracting()) {
      inital.board.setNotice(
        "finish editing or draggin before importing an image ",
      );
      return;
    }

    const boardId = inital.extras.library.activeId;

    busyRef.current = true;
    setBusy(true);

    try {
      const image = await prepareImage(file);
      const current = latest.current;

      if (current.extras.library.activeId !== boardId) {
        throw new Error("the board changed. imprt again cuttie");
      }

      // i love the fact u are reading my code

      // my comments are like easter egg hard to find but lovely when found :)
      if (current.extras.editing || current.extras.isInteracting()) {
        throw new Error("finish the current edit then import the image again");
      }

      if (current.board.shapes.length >= 1000) {
        throw new Error("this board has reached 1000 shapes");
      }

      const view = current.extras.view;

      const scale = Math.min(
        1,
        (view.width * 0.6) / image.width,
        (view.height * 0.6) / image.height,
      );

      const width = image.width * scale;
      const height = image.height * scale;

      const shape: Shape = {
        id: crypto.randomUUID(),
        kind: "image",
        x: view.x + (view.width - width) / 2,
        y: view.y + (view.height - height) / 2,
        width,
        height,
        color: "#292524",
        strokeWidth: 1,
        points: [],
        imageData: image.data,
      };

      current.board.commit([shape, ...current.board.shapes]);

      current.extras.changeTool("select");
      current.selectOnly(shape.id);
      current.svgRef.current?.focus();
      current.board.setNotice(
        "image added. draw over it or select it to resize",
      );
    } catch (error) {
      latest.current.board.setNotice(
        error instanceof Error ? error.message : "Could not import the image",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!board.ready) return;

    function paste(event: ClipboardEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }

      if (latest.current.extras.editing) return;

      const item = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      );

      const file = item?.getAsFile();
      if (!file) return;

      event.preventDefault();
      void addFile(file);
    }

    window.addEventListener("paste", paste);

    return () => window.removeEventListener("paste", paste);
  }, [board.ready, addFile]);
  return { busy, addFile };
}
