import { defineConfig } from 'vite'
import shaderPlugin from './plugins/vite-shader-plugin';

export default defineConfig({
  plugins: [shaderPlugin()],
});
