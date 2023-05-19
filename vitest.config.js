import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['tests/*.test.js', '*.test.js'],
    testTimeout: 30000,
  },
})