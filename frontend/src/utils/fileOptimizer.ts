/**
 * File Optimizer & Validation Utility
 * Supports client-side compression for images (JPEG, PNG, WebP) using HTML5 Canvas,
 * multi-format validation (PDF, Word, Excel, CSV, Images), and savings calculation.
 */

export interface OptimizedFileResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
  isOptimized: boolean;
  dimensions?: {
    originalWidth: number;
    originalHeight: number;
    optimizedWidth: number;
    optimizedHeight: number;
  };
}

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Format bytes to readable string (e.g. 1.25 MB, 450 KB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Validate file against allowed extensions, mime types, and size constraints
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum limit of 25 MB (Current size: ${formatBytes(file.size)})`,
    };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = ALLOWED_FILE_TYPES.includes(file.type) || file.type === '';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload a PDF, Word (.docx/.doc), Excel (.xlsx/.xls), CSV, or Image (JPG, PNG, WebP).`,
    };
  }

  return { valid: true };
}

/**
 * Optimize an image file client-side using HTML5 Canvas
 * Resizes images exceeding maxDimension (default: 1920px) and compresses to WebP/JPEG (quality: 0.82)
 */
export async function optimizeFileBeforeUpload(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
  } = {}
): Promise<OptimizedFileResult> {
  const { maxDimension = 1920, quality = 0.82 } = options;
  const originalSize = file.size;

  // Only compress raster images
  const isRasterImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (!isRasterImage || typeof window === 'undefined') {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savingsBytes: 0,
      savingsPercent: 0,
      isOptimized: false,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      // Calculate downscaled dimensions if exceeding maxDimension
      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        if (originalWidth > originalHeight) {
          targetWidth = maxDimension;
          targetHeight = Math.round((originalHeight * maxDimension) / originalWidth);
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round((originalWidth * maxDimension) / originalHeight);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          file,
          originalSize,
          optimizedSize: originalSize,
          savingsBytes: 0,
          savingsPercent: 0,
          isOptimized: false,
        });
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Determine output MIME type: prefer image/webp for optimal compression, fallback to image/jpeg
      const outputType = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              originalSize,
              optimizedSize: originalSize,
              savingsBytes: 0,
              savingsPercent: 0,
              isOptimized: false,
            });
            return;
          }

          // Check if compressed blob is actually smaller
          if (blob.size < originalSize) {
            const savingsBytes = originalSize - blob.size;
            const savingsPercent = Math.round((savingsBytes / originalSize) * 100);

            const optimizedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve({
              file: optimizedFile,
              originalSize,
              optimizedSize: blob.size,
              savingsBytes,
              savingsPercent,
              isOptimized: true,
              dimensions: {
                originalWidth,
                originalHeight,
                optimizedWidth: targetWidth,
                optimizedHeight: targetHeight,
              },
            });
          } else {
            // Keep original file if compression didn't yield savings
            resolve({
              file,
              originalSize,
              optimizedSize: originalSize,
              savingsBytes: 0,
              savingsPercent: 0,
              isOptimized: false,
              dimensions: {
                originalWidth,
                originalHeight,
                optimizedWidth: targetWidth,
                optimizedHeight: targetHeight,
              },
            });
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        optimizedSize: originalSize,
        savingsBytes: 0,
        savingsPercent: 0,
        isOptimized: false,
      });
    };

    img.src = objectUrl;
  });
}
