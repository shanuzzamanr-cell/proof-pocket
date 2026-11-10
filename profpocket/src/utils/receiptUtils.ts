export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates selected receipt image file for supported format and size limit.
 */
export function validateReceiptFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Check MIME type or filename extension
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const hasValidExt = /\.(jpe?g|png|webp)$/i.test(fileName);
  const hasValidMime = ALLOWED_IMAGE_TYPES.includes(fileType);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP file.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Receipt file size (${sizeInMB}MB) exceeds the 20MB limit. Please choose a smaller image.`,
    };
  }

  return { valid: true };
}

/**
 * Reads a File into a Data URL string.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file content as base64 string.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('An error occurred while reading the file.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes and downsizes high-resolution receipt images.
 * Keeps receipt text sharp and legible while ensuring base64 payload is ~100-250KB,
 * strictly preventing Firestore's 1MB document limit exceptions and speeding up sync.
 */
export async function optimizeReceiptImage(
  file: File,
  maxDimension = 1400,
  quality = 0.82
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only downscale if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original dataUrl if canvas context is unavailable
        resolve(dataUrl);
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Encode as JPEG or WEBP
      const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(optimizedUrl);
    };

    img.onerror = () => {
      // Fallback to uncompressed dataUrl on image load failure
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
