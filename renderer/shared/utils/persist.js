const loadDb = global.prepareDb || {}

export function loadState(dbName) {
  try {
    const value = loadDb(dbName).getState()

    return Object.keys(value).length === 0 ? null : value || null
  } catch (error) {
    return null
  }
}

export function loadItem(dbName, key) {
  if (!key) {
    throw new Error('loadItem requires key to be passed')
  }
  const state = loadState(dbName)
  return (state && state[key]) || null
}

export function persistItem(dbName, key, value) {
  // if we have something to save
  loadDb(dbName)
    .set(key, value)
    .write()
}

export function persistState(name, state) {
  loadDb(name)
    .setState(state)
    .write()
}

/**
 * Checks if action or action list has the name passed
 * @param {(string|string[])} actionList
 * @param {string} action
 */
export function shouldPersist(actionList, action) {
  if (!actionList || actionList.length === 0) {
    return true
  }
  const actionName = Array.isArray(action) ? action[0] : action.type
  return Array.isArray(actionList)
    ? actionList.includes(actionName)
    : actionList === actionName
}
