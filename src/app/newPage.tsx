// This file will be moved to the project root app directory.

'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/ChatInterface'
import { Message } from '@/types/message'

export default function NewPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])

  const handleMessageSubmit = async (message: string) => {
    setIsLoading(true)
    try {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: message,
        role: 'user',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, newMessage])

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content,
        role: 'assistant',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Update follow-up questions
      if (data.follow_up_messages && data.follow_up_messages.length > 0) {
        setFollowUpQuestions(data.follow_up_messages)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <ChatInterface className="w-full" />
      </div>
    </main>
  );
} 