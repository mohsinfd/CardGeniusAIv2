import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: false, // Allow fallback to another port if 3000 is in use
      open: true,
      fs: {
        strict: false
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      },
    },
    publicDir: 'data',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    define: {
      'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY),
      'import.meta.env.VITE_OPENAI_MODEL': JSON.stringify(env.VITE_OPENAI_MODEL),
      'import.meta.env.VITE_OPENAI_TEMPERATURE': JSON.stringify(env.VITE_OPENAI_TEMPERATURE),
      'import.meta.env.VITE_OPENAI_MAX_TOKENS': JSON.stringify(env.VITE_OPENAI_MAX_TOKENS)
    },
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'],
    },
    build: {
      commonjsOptions: {
        include: [/@duckdb\/duckdb-wasm/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'duckdb': ['@duckdb/duckdb-wasm']
          }
        }
      }
    },
  };
}); 