import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { AlertTriangle, Check, ChevronDown, CloudLightning, CloudRain, CloudSnow, CloudSun, LocateFixed, Search, Wind, X } from 'lucide-react';
import './WeatherControls.css';

const NWS_ALERTS = 'https://api.weather.gov/alerts/active?status=actual';
const RADAR_URL = 'https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity/MapServer/WMSServer';
const usLocations = new Set(['New York', 'Los Angeles', 'Chicago']);

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function containsPoint(geometry, position) {
  if (!geometry || !position) return false;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const point = [position[1], position[0]];
  return polygons.some(polygon => polygon.length && inRing(point, polygon[0]) && !polygon.slice(1).some(hole => inRing(point, hole)));
}
function WeatherIcon({ name }) {
  const text = (name || '').toLowerCase();
  if (/thunder|tornado|storm/.test(text)) return <CloudLightning size={17} />;
  if (/snow|winter|freez|ice|blizzard/.test(text)) return <CloudSnow size={17} />;
  if (/wind|gale|hurricane/.test(text)) return <Wind size={17} />;
  if (/rain|flood/.test(text)) return <CloudRain size={17} />;
  return <AlertTriangle size={17} />;
}
function WeatherInfo({ properties }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const timerRef = useRef(null);
  const id = useId();
  const cancelHide = () => clearTimeout(timerRef.current);
  const hideSoon = () => { cancelHide(); timerRef.current = setTimeout(() => setVisible(false), 180); };
  const show = () => {
    cancelHide();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    const left = rect.left >= width + 20 ? rect.left - width - 12 : Math.min(window.innerWidth - width - 12, rect.right + 12);
    setPosition({ left: Math.max(12, left), top: Math.max(12, Math.min(rect.top, window.innerHeight - 280)) });
    setVisible(true);
  };
  useEffect(() => {
    if (!visible) return undefined;
    const onScroll = event => { if (!popoverRef.current?.contains(event.target)) setVisible(false); };
    const onPointer = event => { if (!buttonRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setVisible(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('pointerdown', onPointer); window.removeEventListener('resize', onScroll); };
  }, [visible]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  return <><button ref={buttonRef} type="button" className="weather-info-trigger" aria-label={`View info for ${properties.event || 'weather alert'}`} aria-describedby={visible ? id : undefined} aria-expanded={visible} onMouseEnter={show} onMouseLeave={hideSoon} onFocus={show} onBlur={hideSoon} onClick={show} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setVisible(false); } }}>View info</button>{visible && createPortal(<div ref={popoverRef} id={id} role="tooltip" className="weather-info-popover" style={position} onMouseEnter={cancelHide} onMouseLeave={hideSoon}><b>{properties.event || 'Weather alert'}</b>{properties.headline && <p className="weather-info-headline">{properties.headline}</p>}<p>{properties.description || (!properties.headline ? 'Weather information unavailable.' : '')}</p>{properties.instruction && <><b>Instructions</b><p>{properties.instruction}</p></>}</div>, document.body)}</>;
}

function weatherReading(value, unit) {
  if (value === null || value === undefined) return '—';
  const raw = typeof value === 'object' ? value.value : value;
  const number = typeof raw === 'number' ? raw : Number(raw);
  return raw !== '' && Number.isFinite(number) ? `${Math.round(number)}${unit}` : '—';
}

function generatedReadings(properties) {
  const seed = [...`${properties.event || ''}:${properties.areaDesc || ''}`].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 7);
  return { temperature: 10 + seed % 22, humidity: 42 + (seed >>> 5) % 45, wind: 8 + (seed >>> 10) % 30, pressure: 995 + (seed >>> 15) % 31 };
}

function WeatherLocation({ text }) {
  const textRef = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const tooltipId = useId();
  useEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;
    const measure = () => setTruncated(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);
  useEffect(() => {
    if (!visible) return undefined;
    const hide = () => setVisible(false);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
  }, [visible]);
  const show = () => {
    if (!truncated || !textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    setPosition({ left: Math.max(12, rect.left >= width + 20 ? rect.left - width - 12 : Math.min(window.innerWidth - width - 12, rect.left)), top: Math.max(12, Math.min(rect.top, window.innerHeight - 200)) });
    setVisible(true);
  };
  return <><span ref={textRef} className="weather-location-text" tabIndex={truncated ? 0 : undefined} aria-describedby={visible ? tooltipId : undefined} onMouseEnter={show} onMouseLeave={() => setVisible(false)} onFocus={show} onBlur={() => setVisible(false)} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setVisible(false); } }}>{text}</span>{visible && createPortal(<span id={tooltipId} role="tooltip" className="weather-location-tooltip" style={position}>{text}</span>, document.body)}</>;
}

function WeatherMapLayers({ features, enabled, radar, locate }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return undefined;
    const data = { type: 'FeatureCollection', features: features.filter(item => item.geometry && ['Polygon', 'MultiPolygon'].includes(item.geometry.type)) };
    const layer = L.geoJSON(data, { style: { color: '#181818', weight: 1, opacity: 1, fill: true, fillColor: '#000000', fillOpacity: 0.05, interactive: false } }).addTo(map);
    return () => map.removeLayer(layer);
  }, [map, enabled, features]);
  useEffect(() => {
    if (!radar) return undefined;
    const coverages = [[[24, -126], [50, -66]], [[51, -180], [72, -129]], [[18, -161], [23, -154]]];
    const pane = map.getPane('weatherRadar') || map.createPane('weatherRadar');
    pane.style.zIndex = '350';
    pane.style.pointerEvents = 'none';
    const layers = coverages.map(bounds => L.tileLayer.wms(RADAR_URL, { layers: '1', format: 'image/png', transparent: true, opacity: 0.65, bounds, pane: 'weatherRadar', attribution: 'Radar: NOAA / NWS', updateWhenIdle: true }).addTo(map));
    return () => layers.forEach(layer => map.removeLayer(layer));
  }, [map, radar]);
  useEffect(() => {
    if (!locate?.feature?.geometry) return;
    const bounds = L.geoJSON(locate.feature).getBounds();
    if (!bounds.isValid()) return;
    const drawer = document.querySelector('.vehicle-details');
    const mapRect = map.getContainer().getBoundingClientRect();
    const rect = drawer?.getBoundingClientRect();
    const overlapRight = rect && rect.left > mapRect.left && rect.left < mapRect.right ? Math.max(0, mapRect.right - rect.left) : 0;
    map.fitBounds(bounds, { paddingTopLeft: [28, 28], paddingBottomRight: [overlapRight + 28, 28], maxZoom: 10 });
  }, [map, locate]);
  return null;
}
export function WeatherLayers(props) { return <WeatherMapLayers {...props} />; }
export default function WeatherControls({ open, onClose, enabled, setEnabled, radar, setRadar, features, status, error, refresh, vehicles, onLocate }) {
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all');
  const [severityOpen, setSeverityOpen] = useState(false);
  const usVehicles = useMemo(() => vehicles.filter(vehicle => usLocations.has(vehicle.location)), [vehicles]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return features.filter(feature => {
      const p = feature.properties || {};
      return (severity === 'all' || p.severity === severity) && (!search || [p.event, p.headline, p.areaDesc, p.severity].some(value => String(value || '').toLowerCase().includes(search)));
    });
  }, [features, query, severity]);
  if (!open) return null;
  return <section id="weather-alert-panel" className="weather-panel" aria-label="Weather alerts" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <div className="weather-heading"><div><h2>Weather</h2><p>National Weather Service · USA</p></div><button type="button" className="weather-close" aria-label="Close weather panel" onClick={onClose}><X size={17} /></button></div>
    <div className="weather-toggles"><label><span><b>Weather geofences</b><small>Show alert boundaries on map</small></span><input type="checkbox" role="switch" checked={enabled} onChange={event => setEnabled(event.target.checked)} /></label><label><span><b>Radar</b><small>Show precipitation radar</small></span><input type="checkbox" role="switch" checked={radar} onChange={event => setRadar(event.target.checked)} /></label></div>
    <div className="weather-search-row"><label className="weather-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search weather alerts" placeholder="Search weather alerts" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="weather-severity-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSeverityOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setSeverityOpen(false); event.currentTarget.querySelector('.weather-severity-trigger')?.focus(); } }}><button type="button" className="weather-severity-trigger" aria-label="Filter weather alerts by severity" aria-expanded={severityOpen} aria-controls="weather-severity-options" onClick={() => setSeverityOpen(value => !value)}><span>{severity === 'all' ? 'All severity' : severity}</span><ChevronDown size={14} /></button>{severityOpen && <div id="weather-severity-options" className="weather-severity-menu" role="group" aria-label="Choose severity">{[['all', 'All severity'], ['Extreme', 'Extreme'], ['Severe', 'Severe'], ['Moderate', 'Moderate'], ['Minor', 'Minor'], ['Unknown', 'Unknown']].map(([value, label]) => <button type="button" key={value} aria-pressed={severity === value} onClick={event => { setSeverity(value); setSeverityOpen(false); event.currentTarget.closest('.weather-severity-picker')?.querySelector('.weather-severity-trigger')?.focus(); }}><span>{label}</span>{severity === value && <Check size={14} aria-hidden="true" />}</button>)}</div>}</div></div>
    <div className="weather-list-heading"><b>Active alerts</b><span>{status === 'ready' ? `${filtered.length} alerts` : ''}</span></div>
    <div className="weather-list" aria-live="polite">
      {status === 'loading' && <div className="weather-empty">Loading NWS alerts…</div>}
      {status === 'error' && <div className="weather-empty"><b>Weather alerts unavailable</b><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div>}
      {status === 'ready' && !filtered.length && <div className="weather-empty">No alerts match your search and filter.</div>}
      {status === 'ready' && filtered.map((feature, index) => { const p = feature.properties || {}; const readings = generatedReadings(p); const hasGeometry = feature.geometry && ['Polygon', 'MultiPolygon'].includes(feature.geometry.type); const count = hasGeometry ? usVehicles.reduce((total, vehicle) => total + (containsPoint(feature.geometry, vehicle.position) ? 1 : 0), 0) : null; return <article className="weather-alert" key={feature.id || p.id || index}><div className="weather-alert-top"><span className="weather-alert-icon"><WeatherIcon name={p.event} /></span><div><b>{p.event || 'Weather alert'}</b><WeatherInfo properties={p} /></div><span className={`weather-severity severity-${String(p.severity || 'unknown').toLowerCase()}`}>{p.severity || 'Unknown'}</span></div><div className="weather-observations" aria-label="Generated weather readings"><div className="weather-observations-label">Generated readings</div><div><span>Temperature</span><b>{readings.temperature} °C</b></div><div><span>Humidity</span><b>{readings.humidity}%</b></div><div><span>Wind speed</span><b>{readings.wind} km/h</b></div><div><span>Pressure</span><b>{readings.pressure} hPa</b></div></div><div className="weather-alert-location"><WeatherLocation text={p.areaDesc || 'Location unavailable'} /><button type="button" aria-label={`Locate ${p.event || 'weather alert'}`} title={hasGeometry ? 'Show alert on map' : 'Boundary unavailable'} disabled={!hasGeometry} onClick={() => onLocate(feature)}><LocateFixed size={15} /></button></div><div className="weather-affected">{count === null ? 'Affected vehicles unavailable · boundary not provided' : `${count} ${count === 1 ? 'vehicle' : 'vehicles'} affected`}</div></article>; })}
    </div>
    <div className="weather-footnote">NWS alerts · Vehicle counts use current fleet positions. <a href="https://www.weather.gov/" target="_blank" rel="noreferrer">weather.gov</a></div>
  </section>;
}
export function useWeatherData(open) {
  const [features, setFeatures] = useState([]);
  const [status, setStatus] = useState('idle');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    let current = true;
    const load = async () => {
      setStatus('loading');
      try {
        const response = await fetch(NWS_ALERTS, { headers: { Accept: 'application/geo+json' }, signal: controller.signal });
        if (!response.ok) throw new Error(`NWS service returned ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.features)) throw new Error('NWS response did not include alerts');
        if (current) { setFeatures(data.features); setStatus('ready'); }
      } catch (error) { if (current && error.name !== 'AbortError') { setFeatures([]); setStatus('error'); } }
    };
    load();
    const timer = setInterval(load, 120000);
    return () => { current = false; controller.abort(); clearInterval(timer); };
  }, [open, retry]);
  return { features, status, refresh: () => setRetry(value => value + 1) };
}
