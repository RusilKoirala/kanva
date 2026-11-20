import he from "zod/v4/locales/he.cjs";
import { getBounds } from "../schema";

import type { Point, Shape } from "../schema";

export type Corner = "nw" | "ne" | "sw" | "se";

export function textWidth(text: string, fontSize: number) {
  const context = document.createElement("canvas").getContext("2d");

  if (!context) return text.length * fontSize * 0.6;

  context.font = `${fontSize}px Arial`;

  return context.measureText(text).width;
}

export function fitText(shape: Shape): Shape {
  if (shape.kind !== "text") return shape;

  const size = shape.fontSize ?? 20;
  const lines = (shape.text ?? "").split("\n");

  return {
    ...shape,
    width: Math.max(12, ...lines.map((line) => textWidth(line, size))),
    height: Math.max(1, lines.length) * size * 1.3,
  };
}

export function wrapText(text: string, width: number, fontSize: number) {
  const result: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";

    for (const character of paragraph) {
      if (line && textWidth(line + character, fontSize) > width) {
        result.push(line);
        line = character;
      } else {
        line += character;
      }
    }

    result.push(line);
  }
  return result;
}

export function resizeShape(
  shape: Shape,
  corner: Corner,
  point: Point,
  keepRatio: boolean,
) {
  const bounds = getBounds(shape);
  const west = corner.endsWith("w");
  const north = corner.startsWith("n");

  const anchorX = west ? bounds.x + bounds.width : bounds.x;

  const anchorY = north ? bounds.y + bounds.height : bounds.y;

  const minimum = shape.kind === "note" ? 80 : 8;

  let width = Math.max(minimum, west ? anchorX - point.x : point.x - anchorX);

  let height = Math.max(minimum, north ? anchorY - point.y : point.y - anchorY);

  if (keepRatio || shape.kind === "text") {
    const ratio = Math.max(1, bounds.width) / Math.max(1, bounds.height);

    if (width / height > ratio) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
  }

  const x = west ? anchorX - width : anchorX;
  const y = north ? anchorY - height : anchorY;

  if (shape.kind === "text") {
    const fontSize = Math.max(
      12,
      Math.min(
        72,
        (Math.round(shape.fontSize ?? 20) * width) / Math.max(1, bounds.width),
      ),
    );

    const resized = fitText({ ...shape, fontSize });

    return {
      ...resized,
      x: west ? anchorX - resized.width : anchorX,
      y: north ? anchorY - resized.height : anchorY,
    };
  }

  if (shape.kind === "pen") {
    return {
      ...shape,
      x,
      y,
      width,
      height,
      points: shape.points.map((point) => ({
        x: ((shape.x + point.x - bounds.x) / Math.max(1, bounds.width)) * width,
        y:
          ((shape.x + point.y - bounds.y) / Math.max(1, bounds.height)) *
          height,
      })),
    };
  }

  if (shape.kind === "line") {
    return {
      ...shape,
      x: shape.width < 0 ? x + width : x,
      y: shape.width < 0 ? y + height : y,
      width: shape.width < 0 ? -width : width,
      height: shape.height < 0 ? -height : height,
    };
  }

  return { ...shape, x, y, width, height };
}
