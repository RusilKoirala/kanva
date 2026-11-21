import { z } from "zod";

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const shapeSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum([
      "pen",
      "rectangle",
      "ellipse",
      "line",
      "text",
      "note",
      "arrow",
      "image",
    ]),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite(),
    height: z.number().finite(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    strokeWidth: z.number().min(1).max(12),
    points: z.array(pointSchema).max(5000),
    text: z.string().max(5000).optional(),
    imageData: z
      .string()
      .max(160000)
      .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
      .optional(),
    fontSize: z.number().min(12).max(72).optional(),
    fill: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
  })
  .refine(
    (shape) => shape.kind !== "pen" || shape.points.length > 0,
    "A pen stroke needs at least one point bruh :D",
  );

export const documentSchema = z
  .object({
    version: z.literal(1),
    elements: z.array(shapeSchema).max(1000),
  })
  .refine(
    (document) =>
      new Set(document.elements.map((element) => element.id)).size ===
      document.elements.length,
    "Shape ID shouldd be unique bro",
  );

export type Point = z.infer<typeof pointSchema>;
export type Shape = z.infer<typeof shapeSchema>;
export type Tool = Exclude<Shape["kind"], "image"> | "select" | "erase";

export function getBounds(shape: Shape) {
  if (shape.kind === "pen") {
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);

    const left = Math.min(...xs);
    const top = Math.min(...ys);

    return {
      x: shape.x + left,
      y: shape.y + top,
      width: Math.max(...xs) - left,
      height: Math.max(...ys) - top,
    };
  }

  return {
    x: Math.min(shape.x, shape.x + shape.width),
    y: Math.min(shape.y, shape.y + shape.height),
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
  };
}
