import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Polyline, useMap } from 'react-leaflet';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Gauge, History, X } from 'lucide-react';

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

// 30-minute intervals for smooth, precise time picking
const timeOptions = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '23:59'
];

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

  // Time Window state (in IST): default to All Day ('00:00' to '23:59')
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

  useEffect(() => {
    setTab('overview');
    setPlaying(false);
    setProgress(0);
    setPlayback(false);
    setStartDate('2026-10-31');
    setEndDate('2026-10-31');
    setStartTime('00:00');
    setEndTime('23:59');
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

  // Click outside to close popover
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
      '2026-10-31': { timeRange: '09:52–10:42', start: '09:52', end: '10:42', distance: vehicle.trip || '18.4 km', area: vehicle.location },
      '2026-10-30': { timeRange: '08:30–17:05', start: '08:30', end: '17:05', distance: '38.6 km', area: `${vehicle.location} Industrial Zone` },
      '2026-10-29': { timeRange: '09:10–16:45', start: '09:10', end: '16:45', distance: '31.2 km', area: `${vehicle.location} Express Ring` }
    };
  }, [vehicle]);

  // Handle day click in calendar: enforce maximum 2 days range rule
  const handleCalendarDayClick = dayKey => {
    setCalendarWarning('');

    if (startDate === endDate) {
      const d1 = parseDateKey(startDate);
      const d2 = parseDateKey(dayKey);
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        setStartDate(dayKey);
        setEndDate(dayKey);
      } else if (diffDays === 1) {
        if (d1 < d2) {
          setStartDate(startDate);
          setEndDate(dayKey);
        } else {
          setStartDate(dayKey);
          setEndDate(startDate);
        }
      } else {
        setStartDate(dayKey);
        setEndDate(dayKey);
        setCalendarWarning('Maximum selection is 2 days at a time. Started new range.');
      }
    } else {
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
  };

  // Quick Shift Time Presets
  const setTimePreset = (from, to) => {
    setStartTime(from);
    setEndTime(to);
  };

  const isAllDay = startTime === '00:00' && endTime === '23:59';
  const isMorningShift = startTime === '06:00' && endTime === '14:00';
  const isBusinessDay = startTime === '09:00' && endTime === '18:00';
  const isEveningShift = startTime === '14:00' && endTime === '22:00';

  const isToday = startDate === '2026-10-31' && endDate === '2026-10-31';
  const isYesterday = startDate === '2026-10-30' && endDate === '2026-10-30';
  const is2Days = startDate === '2026-10-30' && endDate === '2026-10-31';

  // Label for trigger: date range + optional time window
  const dateRangeLabel = useMemo(() => {
    let dateStr = '';
    if (isToday) dateStr = 'Today (31 Oct)';
    else if (isYesterday) dateStr = 'Yesterday (30 Oct)';
    else if (startDate === endDate) {
      const d = parseDateKey(startDate);
      dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } else {
      const d1 = parseDateKey(startDate);
      const d2 = parseDateKey(endDate);
      dateStr = `${d1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${d2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }

    if (!isAllDay) {
      return `${dateStr} · ${startTime}–${endTime}`;
    }
    return dateStr;
  }, [startDate, endDate, isToday, isYesterday, isAllDay, startTime, endTime]);

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
            <span>Live Details</span>
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

      {/* Product Date & Time Range Picker Bar (Above Timeline, Trips, Events tabs) */}
      {tab === 'history' && (
        <div className="history-date-filter-bar">
          <div className="date-picker-dropdown">
            <button
              type="button"
              className={`date-picker-trigger ${calendarOpen ? 'active' : ''}`}
              onClick={() => setCalendarOpen(!calendarOpen)}
              aria-label="Change history date and time range"
              aria-expanded={calendarOpen}
            >
              <Calendar size={13} className="date-picker-icon" />
              <span className="date-picker-label">{dateRangeLabel}</span>
              <span className="date-picker-range-tag">{startDate === endDate ? '1 Day' : '2 Days'}</span>
              <ChevronDown size={13} className={`date-picker-chevron ${calendarOpen ? 'open' : ''}`} />
            </button>

            {/* Interactive Popover Calendar + Time Selector */}
            {calendarOpen && (
              <div className="date-picker-popover" role="dialog" aria-label="Select history date and time range">
                {/* 1. Date Range Section */}
                <div className="popover-section-label">Date Range (Max 2 Days)</div>
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

                {/* Quick Date Presets Row inside popover */}
                <div className="cal-date-presets-row">
                  <button
                    type="button"
                    className={`cal-preset-action ${isToday ? 'active' : ''}`}
                    onClick={() => setQuickPreset('today')}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`cal-preset-action ${isYesterday ? 'active' : ''}`}
                    onClick={() => setQuickPreset('yesterday')}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    className={`cal-preset-action ${is2Days ? 'active' : ''}`}
                    onClick={() => setQuickPreset('2days')}
                  >
                    Last 2 Days
                  </button>
                </div>

                {/* 2. Time Window Section (in IST) */}
                <div className="date-picker-time-section">
                  <div className="time-section-header">
                    <span className="time-title">
                      <Clock size={12} /> Time Window (IST)
                    </span>
                    <button
                      type="button"
                      className={`time-all-day-btn ${isAllDay ? 'active' : ''}`}
                      onClick={() => setTimePreset('00:00', '23:59')}
                    >
                      All Day
                    </button>
                  </div>

                  {/* From / To time dropdowns */}
                  <div className="time-inputs-grid">
                    <div className="time-input-box">
                      <label htmlFor="time-from">From</label>
                      <select
                        id="time-from"
                        className="time-select"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                      >
                        {timeOptions.map(t => (
                          <option key={`from-${t}`} value={t}>{t} IST</option>
                        ))}
                      </select>
                    </div>

                    <div className="time-input-box">
                      <label htmlFor="time-to">To</label>
                      <select
                        id="time-to"
                        className="time-select"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                      >
                        {timeOptions.map(t => (
                          <option key={`to-${t}`} value={t}>{t} IST</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Common Operational Shift Presets */}
                  <div className="time-presets-row">
                    <button
                      type="button"
                      className={`time-preset-chip ${isMorningShift ? 'active' : ''}`}
                      onClick={() => setTimePreset('06:00', '14:00')}
                    >
                      06:00–14:00 (Shift 1)
                    </button>
                    <button
                      type="button"
                      className={`time-preset-chip ${isBusinessDay ? 'active' : ''}`}
                      onClick={() => setTimePreset('09:00', '18:00')}
                    >
                      09:00–18:00 (Business)
                    </button>
                    <button
                      type="button"
                      className={`time-preset-chip ${isEveningShift ? 'active' : ''}`}
                      onClick={() => setTimePreset('14:00', '22:00')}
                    >
                      14:00–22:00 (Shift 2)
                    </button>
                  </div>
                </div>

                {/* 3. Popover Footer */}
                <div className="cal-footer">
                  <div className="cal-max-note">
                    Max date range: <b>2 days</b> at a time
                  </div>
                  <button
                    type="button"
                    className="cal-done-btn"
                    onClick={() => setCalendarOpen(false)}
                  >
                    Apply Filter
                  </button>
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

              // Filter events by selected sub-view (timeline vs events) AND by time window
              const filteredEvents = dayEvents.filter(e => {
                const matchesView = view !== 'events' || e.at === 38 || e.at === 65;
                const inTimeWindow = isAllDay || (e.time >= startTime && e.time <= endTime);
                return matchesView && inTimeWindow;
              });

              return (
                <div key={dayKey} className="history-day-group">
                  <div className="history-day-header">
                    <span>{formatDayLabel(dayKey)}</span>
                    <span className="history-day-sub">
                      {isAllDay ? 'All Day · IST' : `${startTime}–${endTime} IST`}
                    </span>
                  </div>

                  {view === 'trips' ? (
                    <div className="history-trip">
                      <b>{dayTrip.timeRange} IST · Trip</b>
                      <p>{dayTrip.distance} · {dayTrip.area}</p>
                      <button className="co-button" onClick={openPlayback}>Replay trip</button>
                    </div>
                  ) : filteredEvents.length > 0 ? (
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
                  ) : (
                    <div className="history-empty-window">
                      <span>No events found between {startTime} and {endTime} IST</span>
                      <button
                        type="button"
                        className="reset-time-link"
                        onClick={() => setTimePreset('00:00', '23:59')}
                      >
                        Reset to All Day
                      </button>
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
