import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  appType: 'mpa',
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        reword: resolve(__dirname, 'reword/index.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
