const MAX_DATA_URL_BYTES = 32 * 1024 * 1024
const DATA_IMAGE_URL_RE =
  /^data:image\/(?:apng|bmp|gif|jpeg|pjpeg|png|svg\+xml|tiff|webp|x-icon);base64,/i

function normalizeDataImageURL(value) {
  if (typeof value !== 'string') return null

  const nextValue = value.trim()
  if (!nextValue || nextValue.length > MAX_DATA_URL_BYTES) return null
  if (!DATA_IMAGE_URL_RE.test(nextValue)) return null

  return nextValue
}

function isEmptyImage(image) {
  return !image || (typeof image.isEmpty === 'function' && image.isEmpty())
}

function toPositiveInteger(value, fallback) {
  const nextValue = Number(value)
  if (!Number.isFinite(nextValue) || nextValue <= 0) return fallback

  return Math.max(1, Math.round(nextValue))
}

function resizing(
  width,
  height,
  maxWidth = 440,
  maxHeight = 330,
  softResize = true
) {
  const ratio = height > 0 ? width / height : 1

  if (width > maxWidth || height > maxHeight) {
    const newWidth = width > height ? maxWidth : maxHeight * ratio
    const newHeight = width < height ? maxHeight : maxWidth / ratio
    return {width: newWidth, height: newHeight}
  }
  if (!softResize) {
    const newWidth = maxWidth / maxHeight < ratio ? maxWidth : maxHeight * ratio
    const newHeight =
      maxWidth / maxHeight > ratio ? maxHeight : maxWidth / ratio
    return {width: newWidth, height: newHeight}
  }
  return {width, height}
}

function resizeImageToDataURL(
  image,
  maxWidth = 400,
  maxHeight = 300,
  softResize = true
) {
  if (isEmptyImage(image) || typeof image.getSize !== 'function')
    return undefined

  const {width, height} = image.getSize()
  const nextWidth = toPositiveInteger(width, 0)
  const nextHeight = toPositiveInteger(height, 0)
  if (!nextWidth || !nextHeight) return undefined

  const boundedMaxWidth = toPositiveInteger(maxWidth, 400)
  const boundedMaxHeight = toPositiveInteger(maxHeight, 300)
  const size = resizing(
    nextWidth,
    nextHeight,
    boundedMaxWidth,
    boundedMaxHeight,
    softResize
  )
  const shouldResize =
    nextWidth > boundedMaxWidth || nextHeight > boundedMaxHeight || !softResize
  const nextImage = shouldResize
    ? image.resize({
        width: toPositiveInteger(size.width, boundedMaxWidth),
        height: toPositiveInteger(size.height, boundedMaxHeight),
      })
    : image

  return isEmptyImage(nextImage) || typeof nextImage.toDataURL !== 'function'
    ? undefined
    : nextImage.toDataURL()
}

function createImageFromDataURL(nativeImage, dataURL) {
  const normalizedDataURL = normalizeDataImageURL(dataURL)
  if (!normalizedDataURL) return null

  const image = nativeImage.createFromDataURL(normalizedDataURL)
  return isEmptyImage(image) ? null : image
}

function createSafeImageBridge({clipboard, nativeImage}) {
  return Object.freeze({
    readText() {
      return clipboard.readText()
    },

    readImageDataURL({
      maxWidth = 400,
      maxHeight = 300,
      softResize = true,
    } = {}) {
      return resizeImageToDataURL(
        clipboard.readImage(),
        maxWidth,
        maxHeight,
        softResize
      )
    },

    writeImageDataURL(dataURL) {
      const image = createImageFromDataURL(nativeImage, dataURL)
      if (!image) return false

      clipboard.writeImage(image)
      return true
    },

    resizeDataURL(dataURL, maxWidth = 400, maxHeight = 300, softResize = true) {
      const image = createImageFromDataURL(nativeImage, dataURL)
      return resizeImageToDataURL(image, maxWidth, maxHeight, softResize)
    },

    resizeDataURLExact(dataURL, width, height) {
      const image = createImageFromDataURL(nativeImage, dataURL)
      if (!image) return undefined

      const nextImage = image.resize({
        width: toPositiveInteger(width, 1),
        height: toPositiveInteger(height, 1),
      })

      return isEmptyImage(nextImage) ||
        typeof nextImage.toDataURL !== 'function'
        ? undefined
        : nextImage.toDataURL()
    },
  })
}

module.exports = {
  createSafeImageBridge,
  normalizeDataImageURL,
  resizeImageToDataURL,
}
