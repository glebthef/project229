
import { useState } from 'react'
import { sports, events } from '../data.js'
import LeftPanel from './LeftPanel'
import RightPanel from './RightPanel'

export default function MainLayout() {
  const [activeId, setActiveId] = useState('football')

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
        />
      </div>
    </div>
  )
}