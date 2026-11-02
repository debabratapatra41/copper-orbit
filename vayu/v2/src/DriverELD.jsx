import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Download } from 'lucide-react';
import './DriverELD.css';

const kinds = { off: { label: 'Off duty', color: '#a6a29c' }, sleeper: { label: 'Sleeper berth', color: '#8d83b4' }, driving: { label: 'Driving', color: '#258159' }, on: { label: 'On duty', color: '#db722e' } };
const pad = n => String(n).padStart(2, '0');
const clock = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const duration = minutes => `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
function dayFor(offset) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset); return date; }
function getLog(vehicle, date) {
  const seed = [...(vehicle.driverId || vehicle.id)].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 7);
  const shift = (seed % 4) * 15;
  const transitions = [[0, 'sleeper'], [360 + shift, 'off'], [390 + shift, 'on'], [420 + shift, 'driving'], [570 + shift, 'on'], [600 + shift, 'driving'], [750 + shift, 'off'], [795 + shift, 'driving'], [915 + shift, 'on'], [960 + shift, 'off'], [1320, 'sleeper']];
  const events = transitions.map(([start, kind], index) => ({ start, end: transitions[index + 1]?.[0] ?? 1440, kind }));
  const totals = Object.fromEntries(Object.keys(kinds).map(kind => [kind, events.filter(event => event.kind === kind).reduce((sum, event) => sum + event.end - event.start, 0)]));
  return { date, events, totals };
}
function downloadLog(vehicle, log) {
  const rows = [`Driver duty record — ${dayKey(log.date)}`, `Driver: ${vehicle.driver}`, `Driver ID: ${vehicle.driverId || 'Unavailable'}`, `Vehicle: ${vehicle.id}`, '', 'Generated record. Not connected to an electronic logging device. Not an official record.', '', ...log.events.map(event => `${clock(event.start)}–${event.end === 1440 ? '24:00' : clock(event.end)}  ${kinds[event.kind].label}  (${duration(event.end - event.start)})`), '', ...Object.keys(kinds).map(kind => `${kinds[kind].label}: ${duration(log.totals[kind])}`)];
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${vehicle.driverId || vehicle.id}-duty-${dayKey(log.date)}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DriverELD({ vehicle }) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const log = useMemo(() => getLog(vehicle, dayFor(0)), [vehicle.driverId, vehicle.id]);
  const today = true;
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const lastEvent = today ? (log.events.find(event => event.start <= currentMinute && event.end > currentMinute) || log.events[0]) : log.events[log.events.length - 1];
  const events = log.events.filter(event => filter === 'all' || event.kind === filter);
  const visible = showAll ? events : events.slice(0, 4);
  return <div className="eld-content">
    <div className="eld-notice">Generated full-day records · ELD not connected</div>
    <div className="eld-driver"><div><span>Driver</span><b>{vehicle.driver}</b></div><div><span>Driver ID</span><b>{vehicle.driverId || 'Not available'}</b></div></div>
    <div className="eld-date-row"><span>Today · {log.date.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span></div>
    <div className="eld-status"><div><span>{today ? 'Status at current time' : 'End-of-day status'}</span><b>{kinds[lastEvent.kind].label}</b></div><div><span>Log status</span><b>Not certified</b></div></div>
    <div className="eld-subheading"><b>Duty totals</b><span>24-hour period</span></div>
    <div className="eld-totals">{Object.entries(kinds).map(([kind, item]) => <div key={kind}><span><i style={{ background: item.color }} />{item.label}</span><b>{duration(log.totals[kind])}</b></div>)}</div>
    <div className="eld-duty-bar" role="img" aria-label="Duty status across the 24-hour day">{log.events.map((event, index) => <span key={index} title={`${clock(event.start)} ${kinds[event.kind].label}`} style={{ width: `${(event.end - event.start) / 1440 * 100}%`, background: kinds[event.kind].color }} />)}</div><div className="eld-bar-labels"><span>00:00</span><span>12:00</span><span>24:00</span></div>
    <div className="eld-subheading"><b>Duty log</b><Clock3 size={15} aria-hidden="true" /></div>
    <div className="eld-filters" role="group" aria-label="Filter duty log">{[['all', 'All'], ...Object.entries(kinds).map(([key, value]) => [key, value.label])].map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setShowAll(false); }}>{label}</button>)}</div>
    <div className="eld-events">{visible.length ? visible.map(event => <div key={`${event.start}-${event.kind}`} className="eld-event"><i style={{ background: kinds[event.kind].color }} /><div><b>{kinds[event.kind].label}</b><span>{clock(event.start)}–{event.end === 1440 ? '24:00' : clock(event.end)} · {duration(event.end - event.start)}</span></div></div>) : <p>No duty entries for this status.</p>}</div>
    {events.length > 4 && <button type="button" className="eld-text-button" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all ${events.length} entries`}</button>}
    <div className="eld-footer"><button type="button" className="co-button" onClick={() => downloadLog(vehicle, log)}><Download size={14} />Download record</button></div>
  </div>;
}
