/**
 * Client-side resize before mediated poster upload (Epic 8.1).
 * Caps the long edge so payloads stay under the 1MB posters bucket limit.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

/** Resize preserving aspect ratio; encode as JPEG blob. */
export async function resizePosterFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const img = await loadImage(file);
  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });
  if (!blob) throw new Error('Could not encode image');
  return blob;
}
