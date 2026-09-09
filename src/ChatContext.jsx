import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getChatMessages, sendChatMessage } from './api'

const ChatContext = createContext(null)

const POLL_INTERVAL_MS = 4000

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)
  const toggleChat = () => setIsChatOpen(v => !v)

  const loadMessages = useCallback(() => {
    if (!user) return
    getChatMessages(user.id, user.secret)
      .then(setMessages)
      .catch(() => {})
  }, [user])

  // Пока чат открыт и пользователь авторизован — подтягиваем новые
  // сообщения с бэкенда (в т.ч. ответы оператора из админки) поллингом.
  useEffect(() => {
    if (!isChatOpen || !user) return
    loadMessages()
    pollRef.current = setInterval(loadMessages, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [isChatOpen, user, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    setError('')
    try {
      const msg = await sendChatMessage(user.id, user.secret, text)
      setMessages(prev => [...prev, msg])
      setInput('')
    } catch (e) {
      setError(e.message || 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
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

          {!user ? (
            <div className="chat-window__messages">
              <div className="chat-msg chat-msg--support">
                <div className="chat-msg__avatar">🎧</div>
                <div className="chat-msg__bubble">
                  <div className="chat-msg__text">
                    Чтобы написать в поддержку, войдите в аккаунт.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Сообщения */}
              <div className="chat-window__messages">
                {messages.length === 0 && (
                  <div className="chat-msg chat-msg--support">
                    <div className="chat-msg__avatar">🎧</div>
                    <div className="chat-msg__bubble">
                      <div className="chat-msg__text">Здравствуйте! Опишите свой вопрос — оператор ответит здесь.</div>
                    </div>
                  </div>
                )}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`chat-msg ${msg.sender === 'user' ? 'chat-msg--user' : 'chat-msg--support'}`}
                  >
                    {msg.sender === 'support' && (
                      <div className="chat-msg__avatar">🎧</div>
                    )}
                    <div className="chat-msg__bubble">
                      <div className="chat-msg__text">{msg.text}</div>
                      <div className="chat-msg__time">{formatTime(msg.created_at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {error && <div className="chat-window__error">{error}</div>}

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
                  disabled={!input.trim() || sending}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}
