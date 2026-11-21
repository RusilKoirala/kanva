"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { shapeSchema } from "../schema";
import type { Shape } from "../schema";
import type { useWhiteboard } from "./use-whiteboard";

type BoardApi = ReturnType<typeof useWhiteboard>;

const KEY = "kanva-board-library-v1";

const librarySchema = z
  .object({
    activeId: z.string().uuid(),
    boards: z
      .array(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(1).max(60),
          element: z.array(shapeSchema).max(1000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine(
    (library) =>
      library.boards.some((item) => item.id === library.activeId) &&
      new Set(library.boards.map((item) => item.id)).size ===
        library.boards.length &&
      library.boards.every(
        (item) =>
          new Set(item.element.map((shape) => shape.id)).size ===
          item.element.length,
      ),
  );

type Library = z.infer<typeof librarySchema>;

export function useBoardLibrary(board: BoardApi) {
  const current = useRef<Library | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);

  function write(next: Library) {
    current.current = next;
    setLibrary(next);

    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      board.setNotice(
        "board storage is full or unavailablee . please export to keep a copy safe",
      );
    }
  }

  function snapshot(): Library | null {
    const value = current.current;
    if (!value) return null;

    return {
      ...value,
      boards: value.boards.map((item) =>
        item.id === value.activeId ? { ...item, elements: board.shapes } : item,
      ),
    };
  }

  useEffect(() => {
    if (!board.ready) return;

    if (!current.current) {
      try {
      } catch (error) {}
    }
  });
}
