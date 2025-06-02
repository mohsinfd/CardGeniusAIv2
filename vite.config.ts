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
        strict: false,
        allow: ['..'] // Allow serving files from one level up
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      proxy: {
        '/data': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/data/, '/data'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    publicDir: 'public',
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
    }
  };
}); 