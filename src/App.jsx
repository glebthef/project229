import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './componens/Header'  // ← Проверь: components, не componens!
import Footer from './componens/Footer'
import Body from './componens/Body'
import MainLayout from './componens/MainLayout'
import './App.css'

export default function App() {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
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
    <BrowserRouter>
      <Header 
      isLight={isLight} 
      onToggle={() => setIsLight(!isLight)} 
    />
      
      <Routes>
        <Route path="/" element={<Body />} />
        <Route path="/all-sports" element={<MainLayout />} />
      </Routes>
      
      <Footer />
    </BrowserRouter>
  )
}