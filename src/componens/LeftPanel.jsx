export default function LeftPanel({ items, activeId, onSelect }) {
  return (
    <aside className="left-panel">
      <div className="sidebar-header">
        <span className="sidebar-title">Виды спорта</span>
      </div>
      <div className="sports-list">
        {items.map(sport => (
          <button
            key={sport.id}
            className={`sport-item ${activeId === sport.id ? 'active' : ''}`}
            onClick={() => onSelect(sport.id)}
          >
            <span className="icon">{sport.icon}</span>
            <span className="name">{sport.name}</span>
            <span className="count">{sport.count || 0}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}