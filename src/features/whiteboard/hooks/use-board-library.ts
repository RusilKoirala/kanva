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
          elements: z.array(shapeSchema).max(1000),
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
          new Set(item.elements.map((shape) => shape.id)).size ===
          item.elements.length,
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
        const raw = localStorage.getItem(KEY);

        if (raw) {
          const saved = librarySchema.parse(JSON.parse(raw));

          current.current = saved;

          setLibrary(saved);

          const active = saved.boards.find(
            (item) => item.id === saved.activeId,
          )!;

          board.replaceScene(active.elements);
          return;
        }
      } catch {
        board.setNotice("could not resotre board");
      }

      const first = {
        id: crypto.randomUUID(),
        name: "My first board",
        elements: board.shapes,
      };

      write({
        activeId: first.id,
        boards: [first],
      });

      return;
    }

    const next = snapshot();
    if (next) write(next);
  }, [board.ready, board.shapes]);

  function switchBoard(id: string) {
    const saved = snapshot();
    if (!saved || saved.activeId === id) return;

    const nextBoard = saved.boards.find((item) => item.id === id);
    if (!nextBoard) return;

    write({ ...saved, activeId: id });
    board.replaceScene(nextBoard.elements);
  }

  function createBoard() {
    const saved = snapshot();

    if (!saved) return;

    if (saved.boards.length >= 20) {
      board.setNotice("you can keep only 20 boards");
      return;
    }
    const name = window.prompt("Board name", "Untitiled");
    if (name === null) return;

    const nextBoard = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 60) || "Untitiled",
      elements: [] as Shape[],
    };
    write({
      activeId: nextBoard.id,
      boards: [...saved.boards, nextBoard],
    });
    board.replaceScene(nextBoard.elements);
  }

  function renameBoard() {
    const saved = snapshot();
    if (!saved) return;

    const active = saved.boards.find((item) => item.id === saved.activeId);
    if (!active) return;

    const name = window.prompt("Rename board", active.name);

    if (name === null) return;

    write({
      ...saved,
      boards: saved.boards.map((item) =>
        item.id === saved.activeId
          ? {
              ...item,
              name: name.trim().slice(0, 60) || "Untitiled",
            }
          : item,
      ),
    });
  }

  function deleteBoard() {
    const saved = snapshot();
    if (!saved) return;

    if (!window.confirm("Delete this board? this cant be brought back ^-^")) {
      return;
    }

    const remaining = saved.boards.filter((item) => item.id !== saved.activeId);

    if (!remaining.length) {
      remaining.push({
        id: crypto.randomUUID(),
        name: "Untititled",
        elements: [],
      });
    }

    write({
      activeId: remaining[0].id,
      boards: remaining,
    });

    board.replaceScene(remaining[0].elements);
  }

  return {
    activeId: library?.activeId ?? "",
    boards: library?.boards ?? [],
    switchBoard,
    createBoard,
    renameBoard,
    deleteBoard,
  };
}
