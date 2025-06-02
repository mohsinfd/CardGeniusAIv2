import { useEffect, useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import * as duckdb from '@duckdb/duckdb-wasm';
import { initializeDB } from './services/openai';
import { importCSVFiles } from './import_data';
import { createViews } from './create_views';

// Import DuckDB files with ?url suffix for Vite to handle
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

function App() {
  const [db, setDB] = useState<AsyncDuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initDB() {
      try {
        // Define manual bundles with local URLs
        const MANUAL_BUNDLES = {
          mvp: { mainModule: duckdb_wasm, mainWorker: mvp_worker },
          eh: { mainModule: duckdb_wasm_eh, mainWorker: eh_worker },
        };

        // Select appropriate bundle
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        
        // Create worker with correct MIME type
        const worker = new Worker(bundle.mainWorker!, {
          type: 'module',
          name: 'duckdb-worker'
        });
        
        const logger = new duckdb.ConsoleLogger();
        const database = new duckdb.AsyncDuckDB(logger, worker);
        await database.instantiate(bundle.mainModule, bundle.pthreadWorker);

        // Import CSV files and create views
        await importCSVFiles(database);
        await createViews(database);

        // Initialize OpenAI service
        await initializeDB();

        setDB(database);
        setIsLoading(false);
      } catch (err) {
        console.error('Database initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        setIsLoading(false);
      }
    }

    initDB();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>CardGenius AI</h1>
        <p>Your Credit Card Rewards Assistant</p>
      </header>
      <main>
        <ChatInterface />
      </main>
    </div>
  );
}

export default App; 