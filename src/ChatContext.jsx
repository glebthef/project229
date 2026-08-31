import { createContext, useContext, useState, useRef, useEffect } from 'react'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

const AUTO_REPLIES = [
  'Здравствуйте! Мы получили ваше сообщение и скоро ответим.',
  'Спасибо за обращение! Наш специалист рассмотрит ваш вопрос в ближайшее время.',
  'Понял вас. Уточняю информацию, ожидайте ответа.',
  'Ваш запрос принят. Среднее время ответа — 5 минут.',
]

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'support',
      text: 'Здравствуйте! Чем могу помочь?',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)
  const toggleChat = () => setIsChatOpen(v => !v)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    const userMsg = {
      id: Date.now(),
      from: 'user',
      text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      login: user?.login || 'Гость',
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')


    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        from: 'support',
        text: reply,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      }])
    }, 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
      {children}

      {isChatOpen && (
        <div className="chat-window">
          {/* Шапка */}
          <div className="chat-window__header">
            <div className="chat-window__header-info">
              <div className="chat-window__avatar">🎧</div>
              <div>
                <div className="chat-window__title">Поддержка PrimeBet</div>
                <div className="chat-window__status">● Онлайн</div>
              </div>
            </div>
            <button className="chat-window__close" onClick={closeChat}>✕</button>
          </div>

          {/* Сообщения */}
          <div className="chat-window__messages">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`chat-msg ${msg.from === 'user' ? 'chat-msg--user' : 'chat-msg--support'}`}
              >
                {msg.from === 'support' && (
                  <div className="chat-msg__avatar">🎧</div>
                )}
                <div className="chat-msg__bubble">
                  <div className="chat-msg__text">{msg.text}</div>
                  <div className="chat-msg__time">{msg.time}</div>
                </div>
              </div>
            ))}

            {/* Индикатор набора */}
            {isTyping && (
              <div className="chat-msg chat-msg--support">
                <div className="chat-msg__avatar">🎧</div>
                <div className="chat-msg__bubble">
                  <div className="chat-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ввод */}
          <div className="chat-window__input-row">
            <textarea
              className="chat-window__input"
              placeholder="Введите сообщение..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <button
              className="chat-window__send"
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}