import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../dist/webview',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        // Manual chunk splitting for optimized bundle size
        manualChunks: (id) => {
          // Vue ecosystem - separate chunk
          if (id.includes('node_modules/vue')) {
            return 'vue-vendor';
          }
          // Tiptap core and extensions - separate chunk
          if (id.includes('node_modules/@tiptap')) {
            return 'tiptap-vendor';
          }
          // CodeMirror ecosystem - separate chunk
          if (id.includes('node_modules/codemirror') || 
              id.includes('node_modules/@codemirror') ||
              id.includes('node_modules/@lezer')) {
            return 'codemirror-vendor';
          }
          // Syntax highlighting - separate chunk
          if (id.includes('node_modules/highlight.js') ||
              id.includes('node_modules/lowlight')) {
            return 'highlight-vendor';
          }
          // Turndown for markdown conversion
          if (id.includes('node_modules/turndown')) {
            return 'turndown-vendor';
          }
          // ProseMirror
          if (id.includes('node_modules/prosemirror')) {
            return 'prosemirror-vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
