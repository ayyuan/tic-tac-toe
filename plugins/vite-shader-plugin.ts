import { PluginOption, transformWithEsbuild } from 'vite';
import { resolve, sep } from 'path';
import { readFileSync } from 'fs';

const fileRegex = /\.(glsl|frag|vert)$/;
const includeRegex = /^#include(\s+"([^\s]+)")/gm;

export default function shaderPlugin(): PluginOption {
  return {
    name: 'shader-transform',
    enforce: 'pre',
    async transform(src: string, id: string) {
      if (!fileRegex.test(id)) return;
      // get directory path of the current file
      // eg. for the file a/b/c/hader.glsl the directory is a/b/c/
      const segments = id.split(sep);
      segments.pop();
      const directory = segments.join('/') + '/';

      // replace #include with actual file contents
      // NOTE: this isn't recursive so it assumes there are no
      // additional #includes in the file being imported/included
      const result = src.replace(includeRegex, (match: string, p1: string, path: string) => {
        const shader = resolve(directory, path);
        return readFileSync(shader, 'utf8');
      });

      return transformWithEsbuild(result, id, {
        format: 'esm',
        loader: 'text',
        sourcemap: 'external',
      })
    },
  }
}
