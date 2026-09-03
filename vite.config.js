import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative asset paths work out-of-the-box on GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
