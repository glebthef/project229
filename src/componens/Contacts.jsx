import React from 'react'
import { useChat } from '../ChatContext'
export default function Contacts() {
    const { openChat } = useChat()
  return (
    <div className='contacts'>
      <div className="doc-page">
      <div className="doc-inner">
        <h1 className="doc-title">Контакты PrimeBet</h1>
        <p className="doc-updated">Мы на связи 24/7</p>
        <section className="doc-section">
          <h2>Служба поддержки</h2>
          <ul className="contact-list">
            <li>
              <span className="contact-label">Email</span>
              <a href="mailto:support@primebet.com">support@primebet.com</a>
            </li>
            <li>
              <span className="contact-label">Телефон</span>
              <a href="tel:+78001234567">8 800 123-45-67</a>
            </li>
           <li>
            <span className="contact-label">Онлайн-чат</span>
            <a
                href="#"
                className="support-link"
                onClick={e => { e.preventDefault(); openChat() }}
            >
                Написать в поддержку
            </a>
            </li>
          </ul>
        </section>
        <section className="doc-section">
          <h2>Режим работы</h2>
          <p>
            Служба поддержки работает круглосуточно, без выходных. Среднее время
            ответа в чате — до 5 минут, на письма — до 24 часов.
          </p>
        </section>
        <section className="doc-section">
          <h2>Реквизиты</h2>
          <ul className="contact-list">
            <li>
              <span className="contact-label">Компания</span>
              <span>PrimeBet</span>
            </li>
            <li>
              <span className="contact-label">Адрес</span>
              <span>г. Москва, ул. Примерная, д. 1</span>
            </li>
            <li>
              <span className="contact-label">По вопросам СМИ</span>
              <a href="mailto:press@primebet.com">press@primebet.com</a>
            </li>
          </ul>
        </section>
        <section className="doc-section">
          <h2>Мы в соцсетях</h2>
          <div className="contact-socials">
            <a href="#">Telegram</a>
            <a href="#">VK</a>
            <a href="#">YouTube</a>
          </div>
        </section>
      </div>
    </div>
    </div>
  )
}
