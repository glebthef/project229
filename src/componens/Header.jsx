import React from 'react'
import { Link } from 'react-router-dom'

export default function Header({ isLight, onToggle }) {
  return (
    <header className="header">
      <div className="leftside">
        <Link to="/" className="logo">PrimeBet</Link>
        <button className="hbtn">Спорт</button>
        <button className="hbtn">Киберспорт</button>

      </div>

      <div className="rightside">
        <label className="toggle-label">
          <input 
            type="checkbox" 
            className="checkbox" 
            checked={isLight}
            onChange={onToggle}  
          />
          <span className="icon moon">☾</span>
          <span className="icon sun">☀</span>
          <span className="circle"></span>
        </label>

        <button className="hbtn btn-sign">Войти</button>
        <button className="hbtn btn-auth">Регистрация</button>
      </div>
    </header>
  )
}