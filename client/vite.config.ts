import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// vite-plugin-vuetify (tree-shaking) is intentionally omitted for now: the legacy
// Vue 2 hoisted at the root breaks its vue resolution. Re-add it in feat/04 once
// the legacy workspace is removed.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@server': fileURLToPath(new URL('../server/src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/trpc': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
