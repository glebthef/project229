import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Body() {
    const [isChatOpen, setIsChatOpen] = useState(false);
  return (
    <div className="body">
      <div className="main-part">
        <div className="left-side">
          <span className="label">События</span>
          
          <div className="sports-nav">
            <div className="sport-item active">⚽ Футбол</div>
            <div className="sport-item">🎮 Киберспорт</div>
            <div className="sport-item">🏒 Хоккей</div>
            <div className="sport-item">🎾 Теннис</div>
            <div className="sport-item">🏀  Баскетбол</div>
            <div className="sport-item">🏓 Теннис</div>
            <div className="sport-item">🏐 Волейбол</div>
            <Link to="/all-sports" className="show-all-btn">
              Показать все →
            </Link>
          </div>
          <div className="match-block">
            <div className="match-league">⚽ Футбол. Саудовская Аравия. Премьер-лига</div>
            <div className="match-row">
              <div className="match-teams">
                <div className="team">
                  <span className="team-logo">🟡</span>
                  <span className="team-name">Аль Наср</span>
                </div>
                <div className="team">
                  <span className="team-logo">🟢</span>
                  <span className="team-name">Аль Иттифак</span>
                </div>
                <div className="match-time">Сегодня в 21:00</div>
              </div>
              <div className="match-odds">
                <button className="odd">
                  <span className="odd-label">П1</span>
                  <span className="odd-value">1.12</span>
                </button>
                <button className="odd">
                  <span className="odd-label">X</span>
                  <span className="odd-value">9.2</span>
                </button>
                <button className="odd">
                  <span className="odd-label">П2</span>
                  <span className="odd-value">12.37</span>
                </button>
                <button className="odd more">
                  <span className="odd-label">Ещё</span>
                  <span className="odd-value">+ 589</span>
                </button>
              </div>
            </div>
          </div>

          <div className="match-block">
            <div className="match-league">🇺 Футбол. Лига чемпионов УЕФА. 1/4</div>
            <div className="match-row">
              <div className="match-teams">
                <div className="team">
                  <span className="team-logo">🔴</span>
                  <span className="team-name">Арсенал</span>
                </div>
                <div className="team">
                  <span className="team-logo">🟢</span>
                  <span className="team-name">Спортинг</span>
                </div>
                <div className="match-time">Сегодня в 22:00</div>
              </div>
              <div className="match-odds">
                <button className="odd">
                  <span className="odd-label">П1</span>
                  <span className="odd-value">1.56</span>
                </button>
                <button className="odd">
                  <span className="odd-label">X</span>
                  <span className="odd-value">4.4</span>
                </button>
                <button className="odd">
                  <span className="odd-label">П2</span>
                  <span className="odd-value">6.0</span>
                </button>
                <button className="odd more">
                  <span className="odd-label">Ещё</span>
                  <span className="odd-value">+ 2350</span>
                </button>
              </div>
            </div>
          </div>

          <div className="match-block">
            <div className="match-league">🇪 Футбол. Лига чемпионов УЕФА. 1/4</div>
            <div className="match-row">
              <div className="match-teams">
                <div className="team">
                  <span className="team-logo">🔴</span>
                  <span className="team-name">Бавария</span>
                </div>
                <div className="team">
                  <span className="team-logo">⚪</span>
                  <span className="team-name">Реал М</span>
                </div>
                <div className="match-time">Сегодня в 22:00</div>
              </div>
              <div className="match-odds">
                <button className="odd">
                  <span className="odd-label">П1</span>
                  <span className="odd-value">1.54</span>
                </button>
                <button className="odd">
                  <span className="odd-label">X</span>
                  <span className="odd-value">5.4</span>
                </button>
                <button className="odd">
                  <span className="odd-label">П2</span>
                  <span className="odd-value">4.9</span>
                </button>
                <button className="odd more">
                  <span className="odd-label">Ещё</span>
                  <span className="odd-value">+ 2366</span>
                </button>
              </div>
            </div>
          </div>

        </div>
        <div className="right-side">
          <span className="w1">Купон</span>
          <span className="w2">Выберите событие</span>

          <a href="#" className="support-btn" aria-label="Поддержка" onClick={(e)=>{e.preventDefault(); setIsChatOpen(!isChatOpen)}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </a>


        </div>
            {isChatOpen && (
        <div className="chat-up">
            <div className="chat-header">
                    <span>Написать в поддержку</span>
                <button className="close-btn" onClick={() => setIsChatOpen(false)} >✕</button>
            </div>
            
            <div className="chat-body">
                <textarea placeholder="Введите ваше сообщение..." rows="4" ></textarea>
                <button className="send-btn">Отправить</button>
            </div>
        </div>
      )}




      </div>
    </div>
  )
}