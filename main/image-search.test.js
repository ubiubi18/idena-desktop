const {
  _internals: {
    dedupeSearchResults,
    extractDuckDuckGoVqd,
    normalizeImageSearchQuery,
    normalizeImageSearchResult,
    normalizeImageSearchUrl,
    searchDuckDuckGoImages,
  },
} = require('./image-search')

describe('image search helpers', () => {
  test('extracts current DuckDuckGo vqd token shapes', () => {
    expect(extractDuckDuckGoVqd('vqd="abc-123_ABC.0"')).toBe('abc-123_ABC.0')
    expect(
      extractDuckDuckGoVqd('https://duckduckgo.com/i.js?vqd=xyz&x=1')
    ).toBe('xyz')
    expect(extractDuckDuckGoVqd('{"vqd":"token_42"}')).toBe('token_42')
  })

  test('rejects unsafe or unusable image URLs', () => {
    expect(normalizeImageSearchUrl('https://example.com/image.png')).toBe(
      'https://example.com/image.png'
    )
    expect(normalizeImageSearchUrl('http://example.com/image.png')).toBeNull()
    expect(
      normalizeImageSearchUrl('https://user:pass@example.com/image.png')
    ).toBeNull()
    expect(normalizeImageSearchUrl('not a url')).toBeNull()
  })

  test('normalizes provider result shapes', () => {
    expect(
      normalizeImageSearchResult({
        url: 'https://example.com/full.jpg',
        thumbnail_url: 'https://example.com/thumb.jpg',
      })
    ).toEqual({
      image: 'https://example.com/full.jpg',
      thumbnail: 'https://example.com/thumb.jpg',
    })
  })

  test('normalizes queries and dedupes by image URL', () => {
    expect(normalizeImageSearchQuery('  cat\n  sitting\toutside  ')).toBe(
      'cat sitting outside'
    )
    expect(
      dedupeSearchResults([
        {
          image: 'https://example.com/a.jpg',
          thumbnail: 'https://example.com/a-thumb.jpg',
        },
        {
          image: 'https://example.com/a.jpg',
          thumbnail: 'https://example.com/other-thumb.jpg',
        },
        {
          image: 'https://example.com/b.jpg',
          thumbnail: 'https://example.com/b-thumb.jpg',
        },
      ])
    ).toEqual([
      {
        image: 'https://example.com/a.jpg',
        thumbnail: 'https://example.com/a-thumb.jpg',
      },
      {
        image: 'https://example.com/b.jpg',
        thumbnail: 'https://example.com/b-thumb.jpg',
      },
    ])
  })

  test('uses the DuckDuckGo landing token for a bounded image request', async () => {
    const requestText = jest
      .fn()
      .mockResolvedValueOnce('<html><script>vqd="token-123"</script></html>')
      .mockResolvedValueOnce(
        JSON.stringify({
          results: [
            {
              image: 'https://images.example/full.jpg',
              thumbnail: 'https://images.example/thumb.jpg',
            },
            {
              image: 'http://images.example/insecure.jpg',
              thumbnail: 'https://images.example/insecure-thumb.jpg',
            },
          ],
        })
      )

    await expect(
      searchDuckDuckGoImages('Idena cryptocurrency', {requestText})
    ).resolves.toEqual([
      {
        image: 'https://images.example/full.jpg',
        thumbnail: 'https://images.example/thumb.jpg',
      },
    ])

    expect(requestText).toHaveBeenCalledTimes(2)
    const [landingUrl, landingOptions] = requestText.mock.calls[0]
    expect(landingUrl.origin).toBe('https://duckduckgo.com')
    expect(landingUrl.pathname).toBe('/')
    expect(landingUrl.searchParams.get('q')).toBe('Idena cryptocurrency')
    expect(landingOptions).toEqual({
      timeoutMs: 5000,
      maxBytes: 512 * 1024,
    })

    const [apiUrl, apiOptions] = requestText.mock.calls[1]
    expect(apiUrl.href.startsWith('https://duckduckgo.com/i.js?')).toBe(true)
    expect(apiUrl.searchParams.get('q')).toBe('Idena cryptocurrency')
    expect(apiUrl.searchParams.get('vqd')).toBe('token-123')
    expect(apiOptions.headers.referer).toBe(landingUrl.href)
  })
})
