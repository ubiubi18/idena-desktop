const {
  createSafeImageBridge,
  normalizeDataImageURL,
  resizeImageToDataURL,
} = require('./safe-image-bridge')

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQYlWP4//8/AAX+Av5e8BQ1AAAAAElFTkSuQmCC'

function createImage(
  width,
  height,
  dataURL = `data:image/png;base64,${width}x${height}`
) {
  return {
    getSize: jest.fn(() => ({width, height})),
    isEmpty: jest.fn(() => false),
    resize: jest.fn(({width: nextWidth, height: nextHeight}) =>
      createImage(
        nextWidth,
        nextHeight,
        `data:image/png;base64,resized-${nextWidth}x${nextHeight}`
      )
    ),
    toDataURL: jest.fn(() => dataURL),
  }
}

describe('safe image bridge', () => {
  it('normalizes only image data URLs', () => {
    expect(normalizeDataImageURL(` ${PNG_DATA_URL} `)).toBe(PNG_DATA_URL)

    expect(normalizeDataImageURL('https://idena.io/image.png')).toBeNull()
    expect(normalizeDataImageURL(`java${'script'}:alert(1)`)).toBeNull()
    expect(normalizeDataImageURL(null)).toBeNull()
  })

  it('resizes native images to bounded data URLs', () => {
    const image = createImage(800, 400)

    expect(resizeImageToDataURL(image, 400, 300)).toBe(
      'data:image/png;base64,resized-400x200'
    )
    expect(image.resize).toHaveBeenCalledWith({width: 400, height: 200})
  })

  it('exposes limited clipboard and image operations', () => {
    const clipboard = {
      readImage: jest.fn(() => createImage(800, 400)),
      readText: jest.fn(() => 'invite-code'),
      writeImage: jest.fn(),
    }
    const nativeImage = {
      createFromDataURL: jest.fn(() => createImage(10, 10)),
    }
    const bridge = createSafeImageBridge({clipboard, nativeImage})

    expect(bridge.readText()).toBe('invite-code')
    expect(bridge.readImageDataURL({maxWidth: 400, maxHeight: 300})).toBe(
      'data:image/png;base64,resized-400x200'
    )
    expect(bridge.writeImageDataURL(PNG_DATA_URL)).toBe(true)
    expect(clipboard.writeImage).toHaveBeenCalledTimes(1)
  })

  it('rejects unsafe clipboard image writes', () => {
    const clipboard = {
      readImage: jest.fn(),
      readText: jest.fn(),
      writeImage: jest.fn(),
    }
    const nativeImage = {
      createFromDataURL: jest.fn(),
    }
    const bridge = createSafeImageBridge({clipboard, nativeImage})

    expect(bridge.writeImageDataURL('file:///tmp/image.png')).toBe(false)
    expect(nativeImage.createFromDataURL).not.toHaveBeenCalled()
    expect(clipboard.writeImage).not.toHaveBeenCalled()
  })

  it('supports exact data URL resizing for editor placeholders', () => {
    const nativeImage = {
      createFromDataURL: jest.fn(() => createImage(1, 1)),
    }
    const bridge = createSafeImageBridge({
      clipboard: {
        readImage: jest.fn(),
        readText: jest.fn(),
        writeImage: jest.fn(),
      },
      nativeImage,
    })

    expect(bridge.resizeDataURLExact(PNG_DATA_URL, 440, 330)).toBe(
      'data:image/png;base64,resized-440x330'
    )
  })
})
