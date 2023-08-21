import { defineConfig } from 'vitest/config'
import shaderPlugin from './plugins/vite-shader-plugin';

export default defineConfig({
  base: '/tic-tac-toe/',
  build: {
    target: 'esnext',
  },
  plugins: [shaderPlugin()],
  define: {
   'import.meta.vitest': 'undefined',
  },
  test: {
    includeSource: ['src/**/*.{js,ts}'],
  },
});
