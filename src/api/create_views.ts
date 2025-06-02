try {
  // ... existing code ...
} finally {
  // Don't try to close the connection - it's managed by the AsyncDuckDB instance
  // await conn.close(); // Remove this line
} 