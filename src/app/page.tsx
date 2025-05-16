'use client'

import { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/ChatInterface'
import { Message } from '@/types/message'
import '../styles/Home.css';

export default function Home() {
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSubtitle(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container">
      <header className="app-header">
        <div className="logo-container">
          <svg className="logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0066FF" />
                <stop offset="50%" stopColor="#00CC66" />
                <stop offset="100%" stopColor="#0066FF" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" />
            <path d="M8 16L14 22L24 10" />
          </svg>
          <span className="logo-text">CardGenius</span>
        </div>
      </header>

      <main className="main-content">
        <h1 className="main-title">
          <span className="brand-text">CardGenius</span>
          <span className="regular-text"> AI</span>
          <span className="subtitle">
            will recommend the best credit card.
            {showSubtitle && <span className="fade-in"> Just ask.</span>}
          </span>
        </h1>
        <ChatInterface />
      </main>
    </div>
  );
} 