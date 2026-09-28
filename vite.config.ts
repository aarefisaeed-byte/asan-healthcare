import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` → normal site for the server (dist/)
// `npm run build:single` → one self-contained HTML file for quick previews (dist-single/)
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  // The site needs no settings from .env — that file holds server secrets and is readable
  // only by the server user, so point Vite at a folder that has no env files.
  envDir: 'build-env',
  build: mode === 'single' ? { outDir: 'dist-single' } : { outDir: 'dist' },
  // `npm run dev` forwards API calls to the local server (`npm start`)
  server: { proxy: { '/api': 'http://127.0.0.1:3000' } },
}))
