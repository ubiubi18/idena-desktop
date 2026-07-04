import {deletePersistedItem} from './db'

function createDbMock(ids = []) {
  const batch = {
    del: jest.fn(() => batch),
    put: jest.fn(() => batch),
    write: jest.fn().mockResolvedValue(undefined),
  }

  return {
    batch: jest.fn(() => batch),
    get: jest.fn(async (key) => {
      if (key === 'ids') return ids
      const error = new Error('not found')
      error.notFound = true
      throw error
    }),
    batchInstance: batch,
  }
}

describe('shared db utils', () => {
  it('removes deleted ids after reading the persisted id list', async () => {
    const db = createDbMock(['A', 'B', 'C'])

    await expect(deletePersistedItem(db, 'b')).resolves.toBeUndefined()

    expect(db.get).toHaveBeenCalledWith('ids')
    expect(db.batchInstance.put).toHaveBeenCalledWith('ids', ['a', 'c'])
    expect(db.batchInstance.del).toHaveBeenCalledWith('b')
    expect(db.batchInstance.write).toHaveBeenCalledTimes(1)
  })
})
