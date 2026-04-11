export function getImageSrc(
  imageId?: string,
  imageUrl?: string
): string | null {
  if (imageId) return `/api/images/${imageId}`;
  if (imageUrl) return imageUrl;
  return null;
}
