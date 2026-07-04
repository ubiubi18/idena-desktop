import {urlLogContext} from './utils'

describe('dna URL logging', () => {
  it('summarizes URL metadata without query values', () => {
    const context = urlLogContext(
      'https://idena.io/callback?token=secret-token&signature=secret-signature'
    )
    const logged = JSON.stringify(context)

    expect(context).toEqual({
      protocol: 'https:',
      host: 'idena.io',
      pathname: '/callback',
      searchParamKeys: ['signature', 'token'],
    })
    expect(logged).not.toContain('secret-token')
    expect(logged).not.toContain('secret-signature')
  })

  it('accepts URL objects', () => {
    expect(urlLogContext(new URL('dna://signin/v1?token=value'))).toEqual({
      protocol: 'dna:',
      host: 'signin',
      pathname: '/v1',
      searchParamKeys: ['token'],
    })
  })

  it('summarizes invalid URLs without raw content', () => {
    expect(urlLogContext('bad url with secret material')).toEqual({
      type: 'invalid',
      length: 28,
    })
  })
})
