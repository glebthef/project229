import { createContext, useContext, useState } from 'react'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)
  const toggleChat = () => setIsChatOpen(v => !v)

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
      {children}
      {isChatOpen && (
        <div className="chat-up chat-up--floating">
          <div className="chat-header">
            <span>Написать в поддержку</span>
            <button className="close-btn" onClick={closeChat}>✕</button>
          </div>
          <div className="chat-body">
            <textarea placeholder="Введите ваше сообщение..." rows="4"></textarea>
            <button className="send-btn">Отправить</button>
          </div>
        </div>
      )}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}