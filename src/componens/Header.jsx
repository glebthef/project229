import React from 'react'

export default function Header() {
  return (
    <div>
      <header className="header">
        <div className="leftside">
          <div className="logo">PrimeBet</div>
          <button className="hbtn">Спорт</button>
          <button className="hbtn">Киберспорт</button>
          <button className="hbtn">Игры 24/7</button>
        </div>

        <div className="rightside">
          <input type="checkbox" id="theme-switch" className="checkbox" />
          <label htmlFor="theme-switch" className="toggle-label">
            <span className="icon moon">☾</span>
            <span className="icon sun">☀</span>
            <span className="circle"></span>
          </label>

          <button className="hbtn btn-sign">Войти</button>
          <button className="hbtn btn-auth">Регистрация</button>
        </div>
      </header>
    </div>
  )
}