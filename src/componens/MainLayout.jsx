import { useState, useEffect, useCallback } from 'react'
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
    starts_at: e.starts_at,
    time: e.starts_at
      ? new Date(e.starts_at).toLocaleString('ru-RU', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
      : '',
    odds: { p1: e.odd_p1 ?? null, x: e.odd_x ?? null, p2: e.odd_p2 ?? null },
    extra: {
      total_value: e.total_value, odd_total_over: e.odd_total_over,
      odd_total_under: e.odd_total_under, handicap_value: e.handicap_value,
      odd_handicap_home: e.odd_handicap_home, odd_handicap_away: e.odd_handicap_away,
    },
    status: e.status, is_active: e.is_active, fromDB: true,
  }
}

export default function MainLayout({ onAuthOpen, initialSport = 'football' }) {
  const [activeId, setActiveId] = useState(initialSport)
  const [dbEvents, setDbEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const loadEvents = useCallback(() => {
    setLoading(true)
    getEvents(activeId)
      .then(data => setDbEvents(data.map(normalizeEvent)))
      .catch(() => setDbEvents([]))
      .finally(() => setLoading(false))
  }, [activeId])

  useEffect(() => { loadEvents() }, [loadEvents])
  useEffect(() => {
    const interval = setInterval(loadEvents, 30000)
    return () => clearInterval(interval)
  }, [loadEvents])

  const currentSport = sports.find(s => s.id === activeId)
  const activeDbEvents = dbEvents.filter(e => e.is_active)
  const currentEvents = activeDbEvents.length > 0 ? activeDbEvents : (localEvents[activeId] || [])

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
          <Coupon onAuthOpen={onAuthOpen} onEventsUpdate={loadEvents} events={currentEvents} />
        </div>
      </div>
    </div>
  )
}