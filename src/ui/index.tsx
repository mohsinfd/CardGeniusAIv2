import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SpendSchema, calcTopN } from '../calc_savings';
import * as duckdb from '@duckdb/duckdb-wasm';
import { importCSVFiles } from '../import_data';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeDB = async () => {
      try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        const newDb = new duckdb.AsyncDuckDB(logger, worker);
        await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker);
        await importCSVFiles(newDb);
        setDb(newDb);
        addBotMessage("Hi! I'm your credit card recommendation assistant. You can tell me about your spending habits, and I'll help you find the best credit card. For example, you can say 'I spend 5000 on Amazon and 3000 on fuel monthly'.");
      } catch (err) {
        setError('Failed to initialize database. Please refresh the page.');
        console.error('Database initialization error:', err);
      }
    };

    initializeDB();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addBotMessage = (content: string) => {
    setMessages(prev => [...prev, { type: 'bot', content, timestamp: new Date() }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { type: 'user', content, timestamp: new Date() }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !db) return;

    const userInput = input.trim();
    setInput('');
    addUserMessage(userInput);
    setLoading(true);

    try {
      // TODO: Implement intent parsing and clarification flow
      // For now, we'll just try to parse the input directly
      const spendData: Record<string, number> = {};
      const words = userInput.toLowerCase().split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word === 'spend' || word === 'spending') {
          const amount = parseInt(words[i + 1]);
          const category = words[i + 3]?.replace(/[^a-z]/g, '');
          if (!isNaN(amount) && category) {
            spendData[`${category}_spends`] = amount;
          }
        }
      }

      if (Object.keys(spendData).length === 0) {
        addBotMessage("I'm not sure I understand your spending pattern. Could you please tell me how much you spend on different categories? For example: 'I spend 5000 on Amazon and 3000 on fuel monthly'.");
        return;
      }

      const parsedSpend = SpendSchema.parse(spendData);
      const topCards = await calcTopN(db, parsedSpend, 3);

      let response = "Based on your spending, here are the top 3 cards for you:\n\n";
      topCards.forEach((card, index) => {
        response += `${index + 1}. ${card.card_name}\n`;
        response += `   Annual Rewards: ₹${card.annual_total.toLocaleString()}\n`;
        response += "   Category Breakdown:\n";
        card.category_wise_breakdown.forEach(breakdown => {
          response += `   - ${breakdown.category.replace(/_/g, ' ').toUpperCase()}: ₹${breakdown.amount.toLocaleString()} spent, ₹${breakdown.rewards.toLocaleString()} rewards\n`;
        });
        response += "\n";
      });

      addBotMessage(response);
    } catch (err) {
      console.error('Error processing input:', err);
      addBotMessage("I'm having trouble understanding your spending pattern. Could you please rephrase it? For example: 'I spend 5000 on Amazon and 3000 on fuel monthly'.");
    } finally {
      setLoading(false);
    }
  };

  if (!db) {
    return <div style={{ padding: '20px' }}>Loading database...</div>;
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        padding: '20px',
        backgroundColor: '#2c3e50',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1>CardGenius AI</h1>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f8fafc'
      }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '10px'
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '10px 15px',
                borderRadius: '15px',
                backgroundColor: message.type === 'user' ? '#3b82f6' : 'white',
                color: message.type === 'user' ? 'white' : '#1e293b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{
        padding: '20px',
        backgroundColor: 'white',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me about your spending habits..."
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '20px',
              border: '1px solid #cbd5e1',
              outline: 'none'
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export default App; 