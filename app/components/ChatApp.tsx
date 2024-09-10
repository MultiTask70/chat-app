'use client';

import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ClearButton from './ClearButton';
import DebugToggleSwitch from './DebugToggleSwitch';
import { PaperAirplaneIcon } from '@heroicons/react/20/solid';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

interface Message {
  content: string;
  isUser: boolean;
}

const ChatApp: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [clean_history, setCleanHistory] = useState<boolean>(false);
    const [debugMode, setDebugMode] = useState(false);
    const [assistantMode] = useState<'agentic'>('agentic'); // Default to 'agentic'
    const messageContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const storedDebugMode = localStorage.getItem('debugMode');
      setDebugMode(storedDebugMode === 'true');
    }, []);

    const handleSendMessage = async (message: string) => {
        const defaultErrorMessage = "Error while preparing your answer. Check your connectivity to the backend.";
        const authToken = (await fetchAuthSession()).tokens?.idToken?.toString();
        const userAttributes = (await fetchUserAttributes());

        setMessages(prevMessages => [...prevMessages, { content: message, isUser: true }]);

        const rest_api_endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "";
        await fetch(rest_api_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken || ""
          },
          body: JSON.stringify({
            "user_input": message,
            "session_id": userAttributes.sub,
            "clean_history": clean_history,
            "chatbot_type": assistantMode
          })
        })
          .then(response => response.json())
          .then(responseData => {
            setCleanHistory(false);
            let AIMessage: Message;
            if (responseData.errorMessage && debugMode) {
              AIMessage = {
                content: `Error: ${responseData.errorMessage}\n\nDetails: \n\n\`\`\`\n\n${JSON.stringify(responseData, null, 2)}\n\n\`\`\``,
                isUser: false
              };
            } else if (responseData.errorMessage) {
              AIMessage = { content: defaultErrorMessage, isUser: false };
            } else {
              AIMessage = { content: responseData.response, isUser: false };
            }
            setMessages(prevMessages => [...prevMessages, AIMessage]);
          })
          .catch(error => {
            setMessages(prevMessages => [...prevMessages, { content: defaultErrorMessage, isUser: false }]);
          });
      };

    useEffect(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }, [messages]);

    return (
      <div className="flex flex-col justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-sm w-full">
          <div className="space-y-4">
            <div
              ref={messageContainerRef}
              className="h-[68vh] overflow-hidden hover:overflow-y-scroll border-b border-gray-200"
            >
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  content={message.content}
                  isUser={message.isUser}
                />
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                id="chat-message-input"
                className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
                type="text"
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.currentTarget.value !== '') {
                      handleSendMessage(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
                autoComplete="off"
              />
              <button
                className="px-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring focus:bg-blue-600 flex items-center"
                onClick={() => {
                  const inputElement = document.getElementById('chat-message-input') as HTMLInputElement;
                  const message = inputElement.value.trim();
                  if (message !== '') {
                    handleSendMessage(message);
                    inputElement.value = '';
                  }
                }}
              >
                Send
                <PaperAirplaneIcon className="h-5 w-5 text-white ml-2" />
              </button>
            </div>
            <div className="flex justify-between mt-2 items-center w-full">
              <DebugToggleSwitch onToggle={(value) => setDebugMode(value)} />
              <ClearButton
                onClick={() => {
                  setMessages([]);
                  setCleanHistory(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
};

export default ChatApp;
