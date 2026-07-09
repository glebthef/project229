import React from 'react' 
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">© 2026 PrimeBet</span>
        <div className="footer-links">
          <Link to = "/rules" className="">Правила</Link>
          <Link to ="/confidentiality" className="">Конфиденциальность</Link>
          <Link to ="/contacts" className="">Контакты</Link>
        </div>
      </div>
    </footer>
  )
}