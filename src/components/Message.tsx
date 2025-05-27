import React from 'react';
import { ChatMessage } from '../types';
import { CardRecommendationsDisplay } from './CardRecommendationsDisplay';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface MessageProps {
  message: ChatMessage;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const className = `message ${message.role} ${message.isError ? 'error' : ''} ${message.isRecommendation ? 'recommendation-message' : ''}`;

  // Sanitize HTML content if message.content contains HTML
  // For recommendation messages, the main text content is passed as followUpQuestion to CardRecommendationsDisplay
  const sanitizedHtml = message.role === 'assistant' && !message.isRecommendation ? DOMPurify.sanitize(marked.parse(message.content) as string) : null;

  return (
    <div className={className}>
      <div className="message-content">
        {message.isRecommendation && message.recommendations ? (
          <CardRecommendationsDisplay 
            recommendations={message.recommendations} 
            followUpQuestion={message.content} // The original message.content becomes the followUpQuestion
          />
        ) : sanitizedHtml ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        ) : (
          message.content // For user messages or non-HTML assistant messages
        )}
      </div>
    </div>
  );
}; 