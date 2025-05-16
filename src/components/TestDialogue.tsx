import React, { useState } from 'react';
import { DialogueState, SpendingData } from '../types';

const initialSpendingData: SpendingData = {
  monthly: {},
  quarterly: {},
  annual: {}
};

const initialState: DialogueState = {
  askedFields: [],
  pendingFields: [],
  currentField: null,
  previousField: null,
  chainStep: 0,
  spendingData: initialSpendingData
};

const TestDialogue: React.FC = () => {
  const [message, setMessage] = useState('');
  const [dialogueState, setDialogueState] = useState<DialogueState>(initialState);
  const [response, setResponse] = useState<any>(null);
  const [history, setHistory] = useState<Array<{message: string, response: any}>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          dialogueState,
          spendingData: dialogueState.spendingData
        }),
      });

      const data = await res.json();
      setResponse(data);
      setDialogueState(data.dialogue_state || initialState);
      setHistory(prev => [...prev, { message, response: data }]);
      setMessage('');
    } catch (error) {
      console.error('Error:', error);
      setResponse({ error: 'Failed to process request' });
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white">
      <h1 className="text-2xl font-bold mb-4 text-black">Dialogue State Test Interface</h1>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message (e.g., 'I spend 5k on amazon')"
            className="flex-1 p-2 border rounded text-black"
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </form>

      {/* Current State Display */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2 text-black">Current State</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2 text-black">Dialogue State</h3>
            <pre className="whitespace-pre-wrap text-sm text-black">
              {JSON.stringify({
                askedFields: dialogueState?.askedFields || [],
                pendingFields: dialogueState?.pendingFields || [],
                currentField: dialogueState?.currentField,
                previousField: dialogueState?.previousField,
                chainStep: dialogueState?.chainStep
              }, null, 2)}
            </pre>
          </div>
          <div className="border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2 text-black">Spending Data</h3>
            <pre className="whitespace-pre-wrap text-sm text-black">
              {JSON.stringify(dialogueState?.spendingData || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Latest Response */}
      {response && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Latest Response</h2>
          <div className="border rounded p-4 bg-gray-50">
            <pre className="whitespace-pre-wrap text-sm text-black">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-black">Conversation History</h2>
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className="border rounded p-4 bg-gray-50">
              <div className="font-semibold mb-2 text-black">Message: {item.message}</div>
              <pre className="whitespace-pre-wrap text-sm text-black">
                {JSON.stringify(item.response, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="mt-6">
        <button
          onClick={() => {
            setDialogueState(initialState);
            setResponse(null);
            setHistory([]);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset State
        </button>
      </div>
    </div>
  );
};

export default TestDialogue; 