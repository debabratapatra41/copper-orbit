import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Polyline, useMap } from 'react-leaflet';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Gauge, History, X } from 'lucide-react';

export function PlaybackMap({ vehicle, progress, active }) {
  const map = useMap();
  const points = useMemo(() => {
    if (!vehicle) return [];
    const [lat, lng] = vehicle.position;
    return [
      [lat - 0.025, lng - 0.035],
      [lat - 0.02, lng - 0.018],
      [lat - 0.012, lng - 0.012],
      [lat - 0.008, lng + 0.005],
      [lat, lng]
    ];
  }, [vehicle]);

  useEffect(() => {
    if (active && points.length) map.fitBounds(points, { padding: [70, 70], maxZoom: 14 });
  }, [active, map, points]);

  if (!active || !points.length) return null;
  const scaled = (progress / 100) * (points.length - 1);
  const index = Math.min(Math.floor(scaled), points.length - 2);
  const t = scaled - index;
  const point = [
    points[index][0] + (points[index + 1][0] - points[index][0]) * t,
    points[index][1] + (points[index + 1][1] - points[index][1]) * t
  ];

  return (
    <>
      <Polyline positions={points} pathOptions={{ color: '#f36c2d', weight: 4 }} />
      <CircleMarker
        center={point}
        radius={9}
        pathOptions={{ color: '#fff', weight: 3, fillColor: '#25734a', fillOpacity: 1 }}
      />
    </>
  );
}

// Helper date utilities
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDayLabel(dateKey) {
  const d = parseDateKey(dateKey);
  if (dateKey === '2026-10-31') return 'Today, 31 Oct 2026';
  if (dateKey === '2026-10-30') return 'Yesterday, 30 Oct 2026';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VehicleDetails({ vehicle, onClose, onLocate, playback, setPlayback, progress, setProgress }) {
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState('timeline');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Date Range state: default to Today only ('2026-10-31')
  const [startDate, setStartDate] = useState('2026-10-31');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 9, 1)); // October 2026
  const [calendarWarning, setCalendarWarning] = useState('');

  useEffect(() => {
    setTab('overview');
    setPlaying(false);
    setProgress(0);
    setPlayback(false);
    setStartDate('2026-10-31');
    setEndDate('2026-10-31');
    setCalendarOpen(false);
  }, [vehicle.id]);

  useEffect(() => {
    if (!playing || !playback) return;
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, p + speed);
      });
    }, 350);
    return () => clearInterval(timer);
  }, [playing, playback, speed, setProgress]);

  // Click outside to close calendar
  useEffect(() => {
    const handlePointerDown = e => {
      if (!e.target.closest('.date-picker-dropdown')) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [calendarOpen]);

  const offline = vehicle.sampleContext?.kind === 'offline';
  const openPlayback = () => {
    setProgress(0);
    setPlayback(true);
    setPlaying(false);
  };

  const seconds = 9 * 3600 + 52 * 60 + 30 + Math.round(progress * 30);
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(n => String(n).padStart(2, '0'))
    .join(':');

  // Multi-day events dataset
  const eventsByDay = useMemo(() => {
    return {
      '2026-10-31': [
        { at: 0, time: '09:52', label: 'Trip started', detail: 'Ignition on' },
        { at: 38, time: '10:11', label: 'Stop', detail: 'Stopped for 4 minutes' },
        { at: 65, time: '10:25', label: 'Geofence entry', detail: 'Entered operating zone' },
        { at: 100, time: '10:42', label: 'Trip ended', detail: 'Destination' }
      ],
      '2026-10-30': [
        { at: 0, time: '08:30', label: 'Depot checkout', detail: 'Pre-trip checklist passed' },
        { at: 40, time: '11:15', label: 'Stop', detail: 'Customer drop · 18 min dwell' },
        { at: 75, time: '14:20', label: 'Charging stop', detail: 'Fast DC session (28% to 80%)' },
        { at: 100, time: '17:05', label: 'Depot return', detail: 'Parked in staging yard' }
      ],
      '2026-10-29': [
        { at: 0, time: '09:10', label: 'Trip started', detail: 'Depot dispatch' },
        { at: 50, time: '12:30', label: 'Stop', detail: 'Midday warehouse staging' },
        { at: 100, time: '16:45', label: 'Shift finished', detail: 'Driver check-in complete' }
      ]
    };
  }, []);

  const tripsByDay = useMemo(() => {
    return {
      '2026-10-31': { timeRange: '09:52–10:42', distance: vehicle.trip || '18.4 km', area: vehicle.location },
      '2026-10-30': { timeRange: '08:30–17:05', distance: '38.6 km', area: `${vehicle.location} Industrial Zone` },
      '2026-10-29': { timeRange: '09:10–16:45', distance: '31.2 km', area: `${vehicle.location} Express Ring` }
    };
  }, [vehicle]);

  // Handle day click in calendar: enforce maximum 2 days range rule
  const handleCalendarDayClick = dayKey => {
    setCalendarWarning('');

    if (startDate === endDate) {
      // 1 day currently selected: clicking another day
      const d1 = parseDateKey(startDate);
      const d2 = parseDateKey(dayKey);
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Clicked same day: keep single day
        setStartDate(dayKey);
        setEndDate(dayKey);
      } else if (diffDays === 1) {
        // Exactly adjacent day: valid 2-day range!
        if (d1 < d2) {
          setStartDate(startDate);
          setEndDate(dayKey);
        } else {
          setStartDate(dayKey);
          setEndDate(startDate);
        }
      } else {
        // Exceeded 2 days: reset to new 1-day selection and show notice
        setStartDate(dayKey);
        setEndDate(dayKey);
        setCalendarWarning('Maximum selection is 2 days at a time. Started new range.');
      }
    } else {
      // Already 2 days selected: start fresh single day selection
      setStartDate(dayKey);
      setEndDate(dayKey);
    }
  };

  // Quick Presets
  const setQuickPreset = preset => {
    setCalendarWarning('');
    if (preset === 'today') {
      setStartDate('2026-10-31');
      setEndDate('2026-10-31');
    } else if (preset === 'yesterday') {
      setStartDate('2026-10-30');
      setEndDate('2026-10-30');
    } else if (preset === '2days') {
      setStartDate('2026-10-30');
      setEndDate('2026-10-31');
    }
    setCalendarOpen(false);
  };

  const isToday = startDate === '2026-10-31' && endDate === '2026-10-31';
  const isYesterday = startDate === '2026-10-30' && endDate === '2026-10-30';
  const is2Days = startDate === '2026-10-30' && endDate === '2026-10-31';

  // Date range display string for trigger
  const dateRangeLabel = useMemo(() => {
    if (isToday) return 'Today (31 Oct)';
    if (isYesterday) return 'Yesterday (30 Oct)';
    if (startDate === endDate) {
      const d = parseDateKey(startDate);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    const d1 = parseDateKey(startDate);
    const d2 = parseDateKey(endDate);
    return `${d1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${d2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  }, [startDate, endDate, isToday, isYesterday]);

  // List of active date keys in current range (sorted latest first)
  const activeDateKeys = useMemo(() => {
    if (startDate === endDate) return [startDate];
    const keys = [];
    const curr = parseDateKey(endDate);
    const start = parseDateKey(startDate);
    while (curr >= start) {
      keys.push(toDateKey(curr));
      curr.setDate(curr.getDate() - 1);
    }
    return keys;
  }, [startDate, endDate]);

  // Calendar rendering calculations
  const calendarDays = useMemo(() => {
    const y = displayMonth.getFullYear();
    const m = displayMonth.getMonth();
    const firstDayIndex = new Date(y, m, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, key });
    }
    return cells;
  }, [displayMonth]);

  const monthLabel = displayMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <aside className="vehicle-details" aria-label={`Vehicle details for ${vehicle.id}`}>
      {/* Header */}
      <div className="details-header">
        <div>
          <small>VEHICLE DETAILS</small>
          <h2>{vehicle.id}</h2>
          <p>{vehicle.name} · <span className={`co-status co-status--${vehicle.status}`}>{offline ? 'tracker offline' : vehicle.status}</span></p>
        </div>
        <button className="co-icon-button" aria-label="Close vehicle details" onClick={onClose}><X size={18}/></button>
      </div>

      {/* Refined Segmented Tab Switcher at the Top Middle */}
      <div className="details-switcher-wrap">
        <div className="details-segmented-switcher" role="tablist" aria-label="Vehicle details sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={`segmented-tab ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => { setTab('overview'); setPlayback(false); setPlaying(false); }}
          >
            <Gauge size={14} strokeWidth={2} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={`segmented-tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            <History size={14} strokeWidth={2} />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Normal Tabs: Timeline | Trips | Events */}
      {tab === 'history' && (
        <div className="history-normal-tabs-bar">
          <div className="history-normal-tabs" role="tablist" aria-label="History view">
            {['timeline', 'trips', 'events'].map(item => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={view === item}
                className={`history-normal-tab ${view === item ? 'active' : ''}`}
                onClick={() => setView(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Date Range Picker Bar (Above History Timelines/Trips/Events) */}
      {tab === 'history' && (
        <div className="history-date-filter-bar">
          <div className="date-picker-dropdown">
            <button
              type="button"
              className={`date-picker-trigger ${calendarOpen ? 'active' : ''}`}
              onClick={() => setCalendarOpen(!calendarOpen)}
              aria-label="Change history date range"
              aria-expanded={calendarOpen}
            >
              <Calendar size={13} className="date-picker-icon" />
              <span className="date-picker-label">{dateRangeLabel}</span>
              <span className="date-picker-range-tag">{startDate === endDate ? '1 Day' : '2 Days'}</span>
              <ChevronDown size={13} className={`date-picker-chevron ${calendarOpen ? 'open' : ''}`} />
            </button>

            {/* Interactive Popover Calendar */}
            {calendarOpen && (
              <div className="date-picker-popover" role="dialog" aria-label="Select history date range">
                <div className="calendar-header">
                  <button
                    type="button"
                    className="cal-nav-btn"
                    onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="cal-month-title">{monthLabel}</span>
                  <button
                    type="button"
                    className="cal-nav-btn"
                    onClick={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Day Header Row */}
                <div className="cal-weekdays">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
                    <span key={w}>{w}</span>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="cal-grid">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return <span key={`empty-${idx}`} className="cal-empty-cell" />;
                    }

                    const isStart = cell.key === startDate;
                    const isEnd = cell.key === endDate;
                    const isSelected = isStart || isEnd;
                    const inRange = cell.key >= startDate && cell.key <= endDate;

                    let rangeClass = '';
                    if (startDate !== endDate) {
                      if (isStart) rangeClass = 'range-start';
                      else if (isEnd) rangeClass = 'range-end';
                      else if (inRange) rangeClass = 'in-range';
                    }

                    return (
                      <div key={cell.key} className={`cal-cell-wrapper ${rangeClass}`}>
                        <button
                          type="button"
                          className={`cal-day-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleCalendarDayClick(cell.key)}
                        >
                          {cell.day}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Warning Notice if selection exceeds 2 days */}
                {calendarWarning && (
                  <div className="cal-warning-banner">
                    {calendarWarning}
                  </div>
                )}

                {/* Popover Footer with Presets & Max Range Constraint note */}
                <div className="cal-footer">
                  <div className="cal-max-note">
                    Max range: <b>2 days</b> at a time
                  </div>
                  <div className="cal-quick-actions">
                    <button type="button" className="cal-preset-action" onClick={() => setQuickPreset('today')}>
                      Today
                    </button>
                    <button type="button" className="cal-preset-action" onClick={() => setQuickPreset('2days')}>
                      Last 2 Days
                    </button>
                    <button
                      type="button"
                      className="cal-done-btn"
                      onClick={() => setCalendarOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick preset buttons beside trigger for rapid 1-click filtering */}
          <div className="date-quick-presets" role="group" aria-label="Quick date options">
            <button
              type="button"
              className={`preset-pill ${isToday ? 'active' : ''}`}
              onClick={() => setQuickPreset('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`preset-pill ${isYesterday ? 'active' : ''}`}
              onClick={() => setQuickPreset('yesterday')}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`preset-pill ${is2Days ? 'active' : ''}`}
              onClick={() => setQuickPreset('2days')}
            >
              2 Days
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="details-content">
        {tab === 'overview' ? (
          <>
            <div className="detail-section">
              <h3>Current status</h3>
              <div className="detail-grid">
                <span>{offline ? 'Last known speed' : 'Speed'} <b>{vehicle.speed}</b></span>
                <span>{offline ? 'Last known energy' : /\bEV\b/i.test(vehicle.name) ? 'Battery' : 'Fuel'} <b>{vehicle.fuel}</b></span>
                <span>{offline ? 'Last known location' : 'Location'} <b>{vehicle.location}</b></span>
                <span>Last update <b>{vehicle.updated}</b></span>
              </div>
            </div>
            <div className="detail-section">
              <h3>{offline ? 'Last assigned' : vehicle.status === 'idle' ? 'Last driven by' : 'Driver'}</h3>
              <p>{vehicle.driver}</p>
            </div>
            <div className="detail-actions">
              <button className="co-button" onClick={() => onLocate(vehicle)}>Show on map</button>
              <button className="co-button" onClick={() => setTab('history')}>View history</button>
            </div>
            {vehicle.sampleContext && (
              <div className="detail-section">
                <h3>{vehicle.sampleContext.title ? 'Exception' : 'Trip'}</h3>
                {vehicle.sampleContext.job && <p><b>Job {vehicle.sampleContext.job.id} · Stop {vehicle.sampleContext.job.stop}</b><br />Next: {vehicle.sampleContext.job.nextStop}{vehicle.sampleContext.eta && <> · {vehicle.sampleContext.eta}</>}</p>}
                {vehicle.sampleContext.title && <p><b>{vehicle.sampleContext.title}</b><br />{vehicle.sampleContext.detail}</p>}
                <p>Live dispatch, diagnostic and tracker data is not connected.</p>
              </div>
            )}
            <div className="detail-section">
              <h3>Maintenance & documents</h3>
              <p>Live maintenance and document data is not connected.</p>
            </div>
          </>
        ) : (
          <>
            {/* Iterating across the selected 1 or 2 days */}
            {activeDateKeys.map(dayKey => {
              const dayEvents = eventsByDay[dayKey] || eventsByDay['2026-10-31'];
              const dayTrip = tripsByDay[dayKey] || tripsByDay['2026-10-31'];
              const filteredEvents = dayEvents.filter(e => view !== 'events' || e.at === 38 || e.at === 65);

              return (
                <div key={dayKey} className="history-day-group">
                  <div className="history-day-header">
                    <span>{formatDayLabel(dayKey)}</span>
                    <span className="history-day-sub">Times in IST</span>
                  </div>

                  {view === 'trips' ? (
                    <div className="history-trip">
                      <b>{dayTrip.timeRange} IST · Trip</b>
                      <p>{dayTrip.distance} · {dayTrip.area}</p>
                      <button className="co-button" onClick={openPlayback}>Replay trip</button>
                    </div>
                  ) : (
                    <div className="history-events">
                      {filteredEvents.map(event => (
                        <button
                          key={`${dayKey}-${event.at}`}
                          onClick={() => { setPlayback(true); setPlaying(false); setProgress(event.at); }}
                        >
                          <b>{event.time} IST · {event.label}</b>
                          <span>{event.detail} · Select to view on map</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {playback && (
              <div className="detail-section playback-box">
                <div className="playback-title">
                  <h3>Trip playback</h3>
                  <button onClick={() => { setPlayback(false); setPlaying(false); }}>Exit replay</button>
                </div>
                <p>Route based on demonstration data</p>
                <div className="playback-controls-row">
                  <button className="co-button" onClick={() => { if (progress === 100) setProgress(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</button>
                  <label>Speed <select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
                </div>
                <input type="range" min="0" max="100" aria-label="Trip playback position" aria-valuetext={`${time} IST`} value={progress} onChange={e => { setPlaying(false); setProgress(Number(e.target.value)); }}/>
                <div className="playback-time">{time} IST <span>{progress}%</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
