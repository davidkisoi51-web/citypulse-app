// Turns an uploaded image file into a compressed JPEG data URL small enough to keep in
// localStorage (which only holds ~5 MB for the whole site). Browser-only (uses canvas).

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // reject huge originals before decoding

export async function resizeImageFile(file, { maxSize = 1000, quality = 0.8 } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG, WebP…).')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 10 MB. Choose a smaller one.')

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image. Try a JPG or PNG.")
  })
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', quality)
}
