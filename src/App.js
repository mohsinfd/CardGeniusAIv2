import React from 'react';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">CardGenius AI</h1>
        <p className="text-gray-400">Your personal credit card recommendation assistant</p>
      </header>
      <main>
        <ChatInterface />
      </main>
    </div>
  );
}

export default App; 