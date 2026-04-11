/**
 * Resolve an image URL from either a GridFS image ID or a direct URL.
 * Priority: image_id → /api/images/{id}, then image_url, then empty string.
 */
export function resolveImageUrl(imageId?: string, imageUrl?: string): string {
  if (imageId) return `/api/images/${imageId}`;
  return imageUrl || "";
}
