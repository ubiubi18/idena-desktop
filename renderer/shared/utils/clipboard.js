export function getImageURLFromClipboard(
  maxWidth = 147 * 2,
  maxHeight = 110 * 2
) {
  return global.clipboard.readImageDataURL({maxWidth, maxHeight})
}

export function writeImageURLToClipboard(url) {
  return global.clipboard.writeImageDataURL(url)
}
