const buildOutputPatterns = [
  '<rootDir>/renderer/.next/',
  '<rootDir>/renderer/out/',
  '<rootDir>/dist/',
  '<rootDir>/node_modules/',
]

module.exports = {
  modulePathIgnorePatterns: buildOutputPatterns,
  testPathIgnorePatterns: buildOutputPatterns,
  watchPathIgnorePatterns: buildOutputPatterns,
}
