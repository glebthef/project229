import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './componens/Header'
import Footer from './componens/Footer'
import Body from './componens/Body'
import MainLayout from './componens/MainLayout'
import AuthModal from './componens/AuthModal'
import { AuthProvider } from './AuthContext'
import './App.css'

export default function App() {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light-theme')
      localStorage.setItem('theme', 'light')
    } else {
      document.body.classList.remove('light-theme')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLight])

  return (
    <AuthProvider>
      <BrowserRouter>
        <Header
          isLight={isLight}
          onToggle={() => setIsLight(!isLight)}
          onAuthOpen={() => setAuthOpen(true)}
        />
        <Routes>
          <Route path="/" element={<Body onAuthOpen={() => setAuthOpen(true)} />} />
          <Route path="/all-sports" element={<MainLayout onAuthOpen={() => setAuthOpen(true)} />} />
          <Route path="/all-sports/cybersport" element={<MainLayout onAuthOpen={() => setAuthOpen(true)} initialSport="cybersport" />} />
        </Routes>
        <Footer />
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </BrowserRouter>
    </AuthProvider>
  )
}