import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="message error">
      <div className="message-content">
        <p className="error-text">{message}</p>
      </div>
    </div>
  );
}; 