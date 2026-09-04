import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      // Babel optimizations
      babel: {
        plugins: [],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  // Development server optimizations
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
    },
    // Faster file watching
    watch: {
      usePolling: false,
      interval: 100,
    },
    // Warm up frequently used files
    warmup: {
      clientFiles: [
        './client/src/App.tsx',
        './client/src/main.tsx',
        './client/src/pages/Dashboard.tsx',
      ],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Bundle size optimizations
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'chart-vendor';
            }
            if (id.includes('framer-motion') || id.includes('canvas-confetti')) {
              return 'animation-vendor';
            }
            if (id.includes('jspdf') || id.includes('docx') || id.includes('html2canvas')) {
              return 'doc-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1500,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Source maps for production debugging (optional)
    sourcemap: false,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'wouter',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
    ],
    exclude: ['@google/generative-ai'],
  },
  // Esbuild optimizations for faster builds
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    minifyIdentifiers: process.env.NODE_ENV === 'production',
    minifySyntax: true,
    minifyWhitespace: process.env.NODE_ENV === 'production',
    target: 'es2020',
  },
  // CSS optimization
  css: {
    devSourcemap: false,
  },
});
