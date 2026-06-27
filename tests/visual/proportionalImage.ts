import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type PngDimensions = {
  width: number;
  height: number;
};

export type CompareScaledPngOptions = {
  smallerPng: Buffer;
  largerPng: Buffer;
  artifactBasePath: string;
  pixelThreshold?: number;
  maxMismatchRatio?: number;
};

export type CompareScaledPngResult = {
  mismatchedPixels: number;
  totalPixels: number;
  mismatchRatio: number;
  maxMismatchRatio: number;
  diffPath: string;
  upscaledPath: string;
  largerPath: string;
};

function parsePng(buffer: Buffer) {
  return PNG.sync.read(buffer);
}

function copyPixel(source: PNG, target: PNG, sourceOffset: number, targetOffset: number) {
  target.data[targetOffset] = source.data[sourceOffset];
  target.data[targetOffset + 1] = source.data[sourceOffset + 1];
  target.data[targetOffset + 2] = source.data[sourceOffset + 2];
  target.data[targetOffset + 3] = source.data[sourceOffset + 3];
}

export function upscaleNearest(source: PNG, dimensions: PngDimensions) {
  const target = new PNG(dimensions);
  const xRatio = source.width / dimensions.width;
  const yRatio = source.height / dimensions.height;

  for (let targetY = 0; targetY < dimensions.height; targetY += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(targetY * yRatio));

    for (let targetX = 0; targetX < dimensions.width; targetX += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(targetX * xRatio));
      const sourceOffset = (source.width * sourceY + sourceX) << 2;
      const targetOffset = (dimensions.width * targetY + targetX) << 2;

      copyPixel(source, target, sourceOffset, targetOffset);
    }
  }

  return target;
}

function dimensionsShareAspectRatio(smaller: PngDimensions, larger: PngDimensions) {
  return smaller.width * larger.height === smaller.height * larger.width;
}

export async function compareScaledPngs({
  smallerPng,
  largerPng,
  artifactBasePath,
  pixelThreshold = 0.08,
  maxMismatchRatio = 0.015,
}: CompareScaledPngOptions): Promise<CompareScaledPngResult> {
  const smaller = parsePng(smallerPng);
  const larger = parsePng(largerPng);

  if (!dimensionsShareAspectRatio(smaller, larger)) {
    throw new Error(
      `Cannot compare screenshots with different aspect ratios: ${smaller.width}x${smaller.height} vs ${larger.width}x${larger.height}`,
    );
  }

  if (smaller.width > larger.width || smaller.height > larger.height) {
    throw new Error(
      `Expected the first PNG to be smaller than the second PNG: ${smaller.width}x${smaller.height} vs ${larger.width}x${larger.height}`,
    );
  }

  const upscaled = upscaleNearest(smaller, {
    width: larger.width,
    height: larger.height,
  });
  const diff = new PNG({
    width: larger.width,
    height: larger.height,
  });

  const mismatchedPixels = pixelmatch(upscaled.data, larger.data, diff.data, larger.width, larger.height, {
    threshold: pixelThreshold,
    includeAA: true,
  });
  const totalPixels = larger.width * larger.height;
  const result = {
    mismatchedPixels,
    totalPixels,
    mismatchRatio: mismatchedPixels / totalPixels,
    maxMismatchRatio,
    diffPath: `${artifactBasePath}-diff.png`,
    upscaledPath: `${artifactBasePath}-upscaled.png`,
    largerPath: `${artifactBasePath}-larger.png`,
  };

  await mkdir(dirname(result.diffPath), { recursive: true });
  await Promise.all([
    writeFile(result.diffPath, PNG.sync.write(diff)),
    writeFile(result.upscaledPath, PNG.sync.write(upscaled)),
    writeFile(result.largerPath, PNG.sync.write(larger)),
  ]);

  return result;
}
