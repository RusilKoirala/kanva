import { Scale } from "lucide-react";
import { error } from "next/dist/build/output/log";
import { maximum } from "zod/v4-mini";

// preparing your amazing image into a DATA I CAN USE in that canvas OwO
export async function prepareImage(file: File) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error("choose a png, jpeg or webp image");
  }

  if (file.size > 10_000_000) {
    throw new Error("Choose an image smaller than 10 mb");
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    await image.decode();
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (
      !originalHeight ||
      !originalWidth ||
      originalHeight * originalWidth > 25_000_000
    ) {
      throw new Error("too large to process");
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("could not process");
    }

    let maxmimumSize = 1400;

    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(
        1,
        maxmimumSize / originalWidth,
        maxmimumSize / originalHeight,
      );

      canvas.width = Math.max(1, Math.round(originalWidth * scale));
      canvas.height = Math.max(1, Math.round(originalHeight * scale));

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const data = canvas.toDataURL("image/webp", 0.82);

      if (data.length <= 120000) {
        return {
          data,
          width: canvas.width,
          height: canvas.height,
        };
      }

      maxmimumSize = Math.round(maxmimumSize * 0.75);
    }
    throw new Error("Could not make this image small. try a smaller image");
  } finally {
    URL.revokeObjectURL(url);
  }
}
