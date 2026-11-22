import type { Shape } from "../schema";

export type StylePatch = Partial<
  Pick<Shape, "color" | "fill" | "opacity" | "strokeStyle">
>;

export function supportsFill(shape: Shape) {
  return shape.kind === "rectangle" || shape.kind === "ellipse";
}

export function supportsLineStyle(shape: Shape) {
  return ["rectangle", "ellipse", "line", "arrow", "pen"].includes(shape.kind);
}

export function getStrokeDasharray(shape: Shape) {
  const width = shape.strokeWidth;

  if (shape.strokeStyle === "dashed") {
    return `${width * 4} ${width * 3}`;
  }

  if (shape.strokeStyle === "dotted") {
    return `0 ${width * 2.5}`;
  }

  return undefined;
}

export function applyShapeStyle(shape: Shape, patch: StylePatch): Shape {
  const next = { ...shape };

  if (patch.color !== undefined && shape.kind !== "image") {
    next.color = patch.color;
  }

  if ("fill" in patch && supportsFill(shape)) {
    next.fill = patch.fill;
  }

  if (patch.opacity !== undefined) {
    next.opacity = Math.max(0, Math.min(1, patch.opacity));
  }

  if (patch.strokeStyle !== undefined && supportsLineStyle(shape)) {
    next.strokeStyle = patch.strokeStyle;
  }

  return next;
}
