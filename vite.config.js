import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: [
            'node_modules/ckeditor4/ckeditor.js',
            'node_modules/ckeditor4/config.js',
            'node_modules/ckeditor4/contents.css',
            'node_modules/ckeditor4/styles.js',
            'node_modules/ckeditor4/lang/en.js',
            'node_modules/ckeditor4/vendor/promise.js',
            'node_modules/ckeditor4/skins/moono-lisa/**/*',
            'node_modules/ckeditor4/plugins/**/*',
            '!node_modules/ckeditor4/plugins/**/lang/**/*',
            '!node_modules/ckeditor4/plugins/**/dialogs/lang/**/*',
          ],
          dest: 'ckeditor4',
          rename: { stripBase: 2 },
        },
        {
          src: [
            'node_modules/ckeditor4/plugins/**/lang/en.js',
            'node_modules/ckeditor4/plugins/**/dialogs/lang/en.js',
          ],
          dest: 'ckeditor4',
          rename: { stripBase: 2 },
        },
      ],
    }),
  ],
  base: '/',
  build: {
    outDir: 'build',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import'],
      },
    },
  },
});
