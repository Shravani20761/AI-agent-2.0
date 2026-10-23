import React, { useState, useRef, useEffect } from 'react';
import { askBot } from '../../data/chatbot';
import TextType from './TextType';
import ReactMarkdown from 'react-markdown';

const ChatbotWidget = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'model', 
      text: 'Hello 👋 I am Seagull Academy\'s assistant. How can I help you?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      text: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setError('');

    try {
      // Get bot response
      const botResponse = await askBot(userMessage, messages);
      
      // Add bot response to chat
      setMessages(prev => [...prev, botResponse]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Chatbot error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white z-50 rounded-2xl shadow-lg p-6 flex flex-col h-fit lg:max-h-[785px] border border-gray-100 border-b-4 border-b-gold sm:max-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-grape to-eminence rounded-full flex items-center justify-center">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-bold text-grape">Seagull Assistant</h3>
          <p className="text-xs text-jet/60">Online • Ready to help</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-grape text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md border border-gray-200'
              }`}
            >
              {/* <ReactMarkdown className="text-sm leading-relaxed break-words">{message.text}</ReactMarkdown> */}
              <p className="text-sm leading-relaxed break-words"><ReactMarkdown>{message.text}</ReactMarkdown></p>
              {/* <p className='text-gray-500 text-sm leading-relaxed break-words'>
              <TextType 
                text={message.text}
                typingSpeed={75}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
              />
              </p> */}
              <p className={`text-xs mt-1 opacity-70 ${
                message.role === 'user' ? 'text-white' : 'text-gray-600'
              }`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-md border border-gray-200">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600 text-center">{error}</p>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex gap-2 mt-auto">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-african_violet focus:border-transparent transition-all duration-300 hover:border-african_violet/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className="bg-grape hover:bg-eminence focus:ring-2 focus:ring-african_violet text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatbotWidget;
