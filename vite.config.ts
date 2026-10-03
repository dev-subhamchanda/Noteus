import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@pdftron/pdfjs-express/public/**/*',
          dest: 'pdfjs-express',
          rename: { stripBase: 4 },
        },
      ],
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
