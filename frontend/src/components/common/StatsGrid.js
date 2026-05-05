import React from 'react';

export default function StatsGrid({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <div className="stat-icon" style={{ background: s.bg }}>
            <s.icon size={22} style={{ color: s.color }} />
          </div>
          <div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}