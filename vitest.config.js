import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Los flujos completos tardan 2-4 s en jsdom y pueden duplicar ese tiempo en una máquina ocupada;
  // los 5 s por defecto los volvían intermitentes. Una prueba realmente colgada igual falla.
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'], restoreMocks: true, testTimeout: 15000 },
})
