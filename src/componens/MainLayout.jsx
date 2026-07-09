import { useState } from 'react'
import { sports, events } from '../data.js'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'
import Coupon from './Coupon'

export default function MainLayout({ onAuthOpen, initialSport = 'football' }) {
  const [activeId, setActiveId] = useState(initialSport)

  const currentSport = sports.find(s => s.id === activeId)
  const currentEvents = events[activeId] || []

  return (
    <div className="full-page-layout">
      <div className="main-layout">
        <LeftPanel
          items={sports}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <RightPanel
          title={currentSport?.name || 'Выберите спорт'}
          data={currentEvents}
          onAuthOpen={onAuthOpen}
        />
        <div className="right-side all-sports-coupon">
          <Coupon onAuthOpen={onAuthOpen} />
        </div>
      </div>
    </div>
  )
}