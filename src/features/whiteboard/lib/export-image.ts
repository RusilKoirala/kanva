import { getBounds } from "../schema";
import type { Shape } from "../schema";

export function makeSvg(
  layer: SVGGElement,
  shapes: Shape[],
  transparent: boolean,
) {
  const bounds = shapes.map(getBounds);

  const left = bounds.length ? Math.min(...bounds.map((item) => item.x)) : 0;

  const top = bounds.length ? Math.min(...bounds.map((item) => item.y)) : 0;

  const right = bounds.length
    ? Math.max(...bounds.map((item) => item.x + item.width))
    : 1200;

  const bottom = bounds.length
    ? Math.max(...bounds.map((item) => item.y + item.height))
    : 800;

  const x = Math.floor(left) - 24;
  const y = Math.floor(top) - 24;
  const width = Math.max(1, Math.ceil(right - x) + 24);
  const height = Math.max(1, Math.ceil(bottom - y) + 24);

  if (![x, y, width, height].every(Number.isFinite)) {
    throw new Error("drawing bounds are invalid sadly");
  }

  const contents = new XMLSerializer().serializeToString(layer.cloneNode(true));

  const background = transparent
    ? ""
    : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>`;

  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}" ` +
    `viewBox="${x} ${y} ${width} ${height}">` +
    background + contents + "</svg>";

  return { source, width, height };
}

export async function savePng(
  layer: SVGGElement,
  shapes: Shape[],
  scale: 1 | 2,
  transparent: boolean,
) {
  const svg = makeSvg(layer, shapes, transparent);
  const width = Math.ceil(svg.width * scale);
  const height = Math.ceil(svg.height * scale);

  if (width > 8192 || height > 8192 || width * height > 24_000_000) {
    throw new Error("Drawing too large png. set scale 1x or export svg");
  }

  const url = URL.createObjectURL(
    new Blob([svg.source], { type: "image/svg+xml" }),
  );

  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) throw new Error("Could not create pngg");

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not create PNG."));
      }, "image/png");
    });

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "kanva.png";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
