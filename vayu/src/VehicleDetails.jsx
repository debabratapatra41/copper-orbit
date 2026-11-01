import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Polyline, useMap } from 'react-leaflet';
import { Gauge, History, X } from 'lucide-react';

export function PlaybackMap({ vehicle, progress, active }) {
  const map = useMap();
  const points = useMemo(() => { if (!vehicle) return []; const [lat,lng] = vehicle.position; return [[lat-.025,lng-.035],[lat-.020,lng-.018],[lat-.012,lng-.012],[lat-.008,lng+.005],[lat,lng]]; }, [vehicle]);
  useEffect(() => { if (active && points.length) map.fitBounds(points, {padding:[70,70], maxZoom:14}); }, [active, map, points]);
  if (!active || !points.length) return null;
  const scaled = progress / 100 * (points.length - 1), index = Math.min(Math.floor(scaled), points.length - 2), t = scaled - index;
  const point = [points[index][0] + (points[index+1][0] - points[index][0]) * t, points[index][1] + (points[index+1][1] - points[index][1]) * t];
  return <><Polyline positions={points} pathOptions={{color:'#f36c2d',weight:4}} /><CircleMarker center={point} radius={9} pathOptions={{color:'#fff',weight:3,fillColor:'#25734a',fillOpacity:1}} /></>;
}

export default function VehicleDetails({ vehicle, onClose, onLocate, playback, setPlayback, progress, setProgress }) {
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState('timeline');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => { setTab('overview'); setPlaying(false); setProgress(0); setPlayback(false); }, [vehicle.id]);
  useEffect(() => { if (!playing || !playback) return; const timer = setInterval(() => setProgress(p => { if (p >= 100) { setPlaying(false); return 100; } return Math.min(100, p + speed); }), 350); return () => clearInterval(timer); }, [playing, playback, speed, setProgress]);

  const offline = vehicle.sampleContext?.kind === 'offline';
  const openPlayback = () => { setProgress(0); setPlayback(true); setPlaying(false); };
  const seconds = 9 * 3600 + 52 * 60 + 30 + Math.round(progress * 30);
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  const events = [
    { at: 0, time: '09:52', label: 'Trip started', detail: 'Ignition on' },
    { at: 38, time: '10:11', label: 'Stop', detail: 'Stopped for 4 minutes' },
    { at: 65, time: '10:25', label: 'Geofence entry', detail: 'Entered operating zone' },
    { at: 100, time: '10:42', label: 'Trip ended', detail: 'Destination' }
  ];

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

      {/* Normal Tabs: Timeline | Trips | Events (only when History is selected) */}
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
            <p className="history-caption">31 Oct 2026 · History (IST)</p>
            {view === 'trips' ? (
              <div className="history-trip">
                <b>09:52–10:42 IST · Trip</b>
                <p>{vehicle.trip} · {vehicle.location}</p>
                <button className="co-button" onClick={openPlayback}>Replay trip</button>
              </div>
            ) : (
              <div className="history-events">
                {events.filter(e => view !== 'events' || e.at === 38 || e.at === 65).map(event => (
                  <button key={event.at} onClick={() => { setPlayback(true); setPlaying(false); setProgress(event.at); }}>
                    <b>{event.time} IST · {event.label}</b>
                    <span>{event.detail} · Select to view on map</span>
                  </button>
                ))}
              </div>
            )}
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
