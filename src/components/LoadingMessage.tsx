import React from 'react';

export const LoadingMessage: React.FC = () => {
  return (
    <div className="message assistant loading">
      <div className="message-content">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}; 