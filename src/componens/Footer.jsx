import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-col footer-col--about">
          <div className="footer-logo">PrimeBet</div>
          <p className="footer-about-text">
            Учебный проект букмекерской платформы. Ставки принимаются только
            лицами старше 18 лет.
          </p>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Информация</div>
          <Link to="/rules">Правила приёма ставок</Link>
          <Link to="/rules#responsible-gaming">Ответственная игра</Link>
          <Link to="/confidentiality">Конфиденциальность</Link>
          <Link to="/contacts">Контакты</Link>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Способы оплаты</div>
          <div className="footer-payments">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>МИР</span>
            <span>СБП</span>
          </div>
        </div>
      </div>
      <div className="footer-inner">
        <span className="footer-copy">© 2026 PrimeBet</span>
        <div className="footer-badges">
          <span className="footer-badge">18+</span>
          <span className="footer-badge">Ответственная игра</span>
        </div>
      </div>
    </footer>
  )
}
