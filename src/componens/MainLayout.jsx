import { useState, useEffect } from 'react'
import { sports, events as localEvents } from '../data.js'
import { getEvents } from '../api'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'
import Coupon from './Coupon'

function normalizeEvent(e) {
  return {
    id: e.id,
    league: e.league,
    home: e.home,
    away: e.away,
    sport_slug: e.sport_slug,
    time: e.starts_at
      ? new Date(e.starts_at).toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '',
    odds: { p1: e.odd_p1 ?? null, x: e.odd_x ?? null, p2: e.odd_p2 ?? null },
    fromDB: true,
  }
}

export default function MainLayout({ onAuthOpen, initialSport = 'football' }) {
  const [activeId, setActiveId] = useState(initialSport)
  const [dbEvents, setDbEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getEvents(activeId)
      .then(data => setDbEvents(data.map(normalizeEvent)))
      .catch(() => setDbEvents([]))
      .finally(() => setLoading(false))
  }, [activeId])

  const currentSport = sports.find(s => s.id === activeId)
  const currentEvents = dbEvents.length > 0 ? dbEvents : (localEvents[activeId] || [])

  return (
    <div className="full-page-layout">
      <div className="main-layout">
        <LeftPanel items={sports} activeId={activeId} onSelect={setActiveId} />
        <RightPanel
          title={currentSport?.name || 'Выберите спорт'}
          data={currentEvents}
          loading={loading}
          onAuthOpen={onAuthOpen}
        />
        <div className="right-side all-sports-coupon">
          <Coupon onAuthOpen={onAuthOpen} />
        </div>
      </div>
    </div>
  )
}