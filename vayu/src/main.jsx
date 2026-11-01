import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { ArrowUpRight, Battery, Bell, Bookmark, Check, ChevronDown, ChevronsUp, Clock3, Download, Filter, Fuel, Gauge, ListChevronsDownUp, ListChevronsUpDown, LocateFixed, Map as MapIcon, MapPin, Minus, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Route, Satellite, Signal, Search, TriangleAlert, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '../../design-system.css';
import './styles.css';
import VehicleDetails, { PlaybackMap } from './VehicleDetails';
import VehicleSparkline from './VehicleSparkline';

const seedVehicles = [
  { id: 'VY-2048', name: 'Tata Ace EV', driver: 'Rahul Mehta', status: 'moving', speed: '42 km/h', location: 'Outer Ring Road', updated: 'Now', fuel: '78%', trip: '18.4 km', position: [12.982, 77.603] },
  { id: 'VY-1157', name: 'Ashok Leyland Dost', driver: 'Priya Nair', status: 'idle', speed: '0 km/h', location: 'Whitefield Hub', updated: '2 min', fuel: '64%', trip: '11.2 km', position: [13.011, 77.701] },
  { id: 'VY-3091', name: 'Mahindra Bolero', driver: 'Karan Singh', status: 'alert', speed: '18 km/h', location: 'Hosur Road', updated: '1 min', fuel: '31%', trip: '27.8 km', position: [12.898, 77.646] },
  { id: 'VY-0824', name: 'Tata Intra V30', driver: 'Aisha Khan', status: 'moving', speed: '36 km/h', location: 'Hebbal Flyover', updated: 'Now', fuel: '86%', trip: '9.6 km', position: [13.045, 77.59] },
  { id: 'VY-4412', name: 'Eicher Pro 2049', driver: 'Naveen Rao', status: 'idle', speed: '0 km/h', location: 'West Depot', updated: '6 min', fuel: '52%', trip: '22.1 km', position: [12.946, 77.535] },
  { id: 'VY-1906', name: 'Maruti Super Carry', driver: 'Sanjay Patel', status: 'moving', speed: '48 km/h', location: 'Indiranagar', updated: 'Now', fuel: '70%', trip: '15.7 km', position: [12.978, 77.64] }
];

const hubs = [[12.97,77.59,'Bengaluru'],[28.61,77.21,'Delhi'],[19.07,72.88,'Mumbai'],[51.51,-0.13,'London'],[48.86,2.35,'Paris'],[52.52,13.4,'Berlin'],[40.71,-74,'New York'],[34.05,-118.24,'Los Angeles'],[41.88,-87.63,'Chicago'],[43.65,-79.38,'Toronto'],[35.68,139.69,'Tokyo'],[1.35,103.82,'Singapore'],[25.2,55.27,'Dubai'],[-33.87,151.21,'Sydney'],[-23.55,-46.63,'São Paulo'],[-26.2,28.04,'Johannesburg']];
const sampleTime = Date.now();
const firstNames = ['Aarav','Priya','Rahul','Aisha','Karan','Ananya','Rohan','Meera','Vikram','Neha','Arjun','Kavya','Sanjay','Isha','Naveen','Sara','Daniel','Emily','James','Sofia','David','Olivia','Ahmed','Maria','Kenji'];
const lastNames = ['Sharma','Patel','Nair','Singh','Mehta','Khan','Rao','Kapoor','Gupta','Das','Shah','Verma','Kumar','Reddy','Joshi','Brown','Smith','Wilson','Garcia','Martin','Taylor','Lee','Chen','Kim','Tanaka','Ali','Hassan','Silva','Costa','Miller','Davis','Clark','Evans','Walker','Hall','Scott','Green','Young','Adams','Baker'];
const vehicles = Array.from({length: 3000}, (_, index) => {
  const hub = hubs[index % hubs.length];
  const seed = seedVehicles[index % seedVehicles.length];
  const n = Math.floor(index / hubs.length);
  const driverIndex = index % 1000;
  // These scenarios are illustrative, just like the rest of this prototype's fleet data.
  const kind = ['trip', 'inspection', 'delay', 'energy', 'offline', 'trip'][index % 6];
  const offline = kind === 'offline';
  const job = { id: `DL-${String(index + 248).padStart(3, '0')}`, stop: '4 of 8', nextStop: `${hub[2]} hub` };
  const scenarios = {
    trip: { kind, job, eta: 'ETA in 16–20 min', action: 'View trip' },
    inspection: { kind, title: 'Inspection defect unresolved', detail: 'Dispatch hold · inspection sign-off pending', action: 'View inspection' },
    delay: { kind, job, title: 'Delivery at risk', detail: 'Estimated arrival 8–14 min after delivery window · unassigned', action: 'Review delay' },
    energy: { kind, title: 'Energy stop may be needed', detail: 'Estimated range: 42–50 km · 61 km remaining', action: 'Review energy' },
    offline: { kind, title: 'No tracker update for 12 min', detail: 'Current motion unknown · cause unconfirmed', action: 'Check connection' }
  };
  const updated = offline ? '12 min' : seed.updated;
  return {...seed, status: offline ? 'alert' : seed.status, fuel: kind === 'energy' ? '18%' : seed.fuel, updated, driver: `${firstNames[driverIndex % firstNames.length]} ${lastNames[Math.floor(driverIndex / firstNames.length)]}`, updatedAt: new Date(sampleTime - (parseInt(updated, 10) || 0) * 60000), id: `VY-${String(index + 1001).padStart(4,'0')}`, location: hub[2], sampleContext: scenarios[kind], position: [hub[0] + Math.sin(n * 12.989 + index) * (0.04 + (n % 10) * 0.025), hub[1] + Math.cos(n * 7.31 + index) * (0.04 + (n % 10) * 0.025)]};
});

function ClusteredVehicles({vehicles: items, onSelect}) {
  const map = useMap();
  useEffect(() => {
    const cluster = L.markerClusterGroup({maxClusterRadius: 55, chunkedLoading: true});
    items.forEach(vehicle => {
      const color = vehicle.status === 'moving' ? '#25734a' : vehicle.status === 'alert' ? '#bd3d40' : '#b77900';
      const heading = (parseInt(vehicle.id.slice(3), 10) * 137) % 360;
      const markerHtml = renderToStaticMarkup(<div className="moving-marker"><div className="direction-orbit" style={{transform:`rotate(${heading}deg)`}}><i className="direction-triangle" style={{borderBottomColor: vehicle.status === "idle" ? "#b77900" : "#25734a"}} /></div><div className="moving-marker-body" style={{backgroundColor:color}}><Truck size={16} /></div><div className="moving-marker-label"><b>{vehicle.id}</b> · {vehicle.sampleContext?.kind === 'offline' || vehicle.status === 'idle' ? 'Last: ' : ''}{vehicle.driver}</div></div>);
      const marker = L.marker(vehicle.position, {icon: L.divIcon({className:'fleet-map-marker', html:markerHtml, iconSize:[30,30], iconAnchor:[15,15]})});
      const content = document.createElement('div');
      content.innerHTML = renderToStaticMarkup(<VehicleHoverCard vehicle={vehicle} />);
      marker.bindTooltip(content, {direction:'top', offset:[0,-10], className:'vayu-tooltip'});
      marker.on('click', () => onSelect(vehicle.id));
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    return () => { map.removeLayer(cluster); };
  }, [map, items, onSelect]);
  return null;
}

const statusLabels = { moving: 'Moving', idle: 'Idle', alert: 'Alert' };

function MainNavigation({ onNotice }) {
  const [managementOpen, setManagementOpen] = useState(false);
  const closeIfLeaving = event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setManagementOpen(false);
  };
  return (
    <header className="vayu-header">
      <a className="vayu-brand" href="#fleet" aria-label="Vayu fleet operations home"><img src="/vayu/vayu-mark-orange.png" alt="" className="vayu-mark" /><span className="vayu-wordmark">Vayu</span></a>
      <nav className="primary-nav" aria-label="Primary navigation">
        <a href="#incidents">Incidents</a>
        <div className="nav-group" onMouseEnter={() => setManagementOpen(true)} onMouseLeave={() => setManagementOpen(false)} onFocus={() => setManagementOpen(true)} onBlur={closeIfLeaving}>
          <button className="nav-link active" aria-expanded={managementOpen} aria-haspopup="true" onClick={event => event.preventDefault()}>Management <ChevronDown size={14} strokeWidth={1.8} /></button>
          <div className={`management-menu ${managementOpen ? 'open' : ''}`} role="menu" aria-label="Management sections">
            <a href="#fleet" className="menu-item active" role="menuitem"><span className="menu-icon"><Truck size={16} /></span><span><b>Fleet Details & Map</b><small>Vehicles, status and live location</small></span></a>
            <button className="menu-item" role="menuitem" onClick={() => onNotice('Geofence Unification will be designed next.')}><span className="menu-icon"><MapPin size={16} /></span><span><b>Geofence Unification</b><small>Unify and manage operating zones</small></span></button>
            <button className="menu-item" role="menuitem" onClick={() => onNotice('Action Centre will be designed next.')}><span className="menu-icon"><TriangleAlert size={16} /></span><span><b>Action Centre</b><small>Review exceptions and actions</small></span></button>
          </div>
        </div>
        <a href="#configurations">Configurations</a>
      </nav>
      <div className="header-tools">
        <span className="live-state"><i />Live</span>
        <button className="icon-button" aria-label="Notifications" onClick={() => onNotice('No new notifications.')}><Bell size={16} strokeWidth={1.8} /><i className="notification-dot" /></button>
        <button className="profile-button" aria-label="Open profile" onClick={() => onNotice('Profile settings will be connected next.')}><span>AD</span><span className="profile-copy"><b>Arjun Das</b><small>Fleet admin</small></span><ChevronDown size={14} /></button>
      </div>
    </header>
  );
}

function VehicleContext({ vehicle, onSelect }) {
  const context = vehicle.sampleContext;
  if (!context) return null;
  return <div className={`vehicle-context ${context.title ? `vehicle-context--${context.kind}` : ''}`} aria-label={`${context.title ? 'Exception' : 'Trip'} for ${vehicle.id}`}>
    <span className="vehicle-context-icon" aria-hidden="true">{context.title ? <TriangleAlert size={16} /> : <Route size={16} />}</span>
    <div className="vehicle-context-content">
      {context.job && <div className="vehicle-context-trip"><b>Job {context.job.id} · Stop {context.job.stop}</b><span>Next: {context.job.nextStop}</span>{context.eta && <span>{context.eta}</span>}</div>}
      {context.title && <div className="vehicle-context-alert"><b>{context.title}</b><span>{context.detail}</span></div>}
    </div>
    <button type="button" className="vehicle-context-action" aria-label={`${context.action} for ${vehicle.id}`} title={context.action} onClick={() => onSelect(vehicle.id)}><ArrowUpRight size={16} aria-hidden="true" /></button>
  </div>;
}

function VehicleRow({ vehicle, selected, onSelect, onLocate, compact }) {
  const sampleAddresses = { Bengaluru: '312, Eustoma Serenity Gardens, Nagondanahalli, Whitefield, Bengaluru - 560066', Delhi: '42, Industrial Estate Road, Okhla, New Delhi - 110020', Mumbai: '18, Logistics Park Road, Andheri East, Mumbai - 400069' };
  const address = sampleAddresses[vehicle.location] || `125, Central Logistics Road, ${vehicle.location}`;
  const driverScore = 75 + (Number(vehicle.id.slice(3)) % 25);
  const fuelScore = 70 + (Number(vehicle.id.slice(3)) * 7 % 30);
  const offline = vehicle.sampleContext?.kind === 'offline';
  const isElectric = /\bEV\b/i.test(vehicle.name);
  const timestamp = vehicle.updatedAt.toLocaleString('en-IN', {year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', timeZone:'Asia/Kolkata'}) + ' IST';
  return <div className={`vehicle-row tactical-card ${selected ? 'active' : ''}`} onClick={event => {
    if (!event.target.closest('button, a, input, select, textarea, .tactical-telemetry') && !window.getSelection()?.toString()) onSelect(vehicle.id);
  }}>
    <div className="tactical-header">
      <button className="tactical-identity" onClick={() => onSelect(vehicle.id)} aria-pressed={selected} aria-label={`${vehicle.id}, ${offline ? 'tracker offline' : statusLabels[vehicle.status]}`}><span className={`card-map-marker card-map-marker--${vehicle.status}`} aria-hidden="true"><Truck size={13} /></span><b>{vehicle.id}</b></button>
      <span className="tactical-speed">{offline ? `Last known: ${vehicle.speed}` : vehicle.speed}</span>
      <span className="signal-indicators" title={offline ? 'Tracker offline' : 'GPS 11 satellites; network 4G, strong signal'} aria-label={offline ? 'Tracker offline' : 'GPS 11 satellites; network 4G, strong signal'}>{offline ? 'GPS stale' : <><span><Satellite size={13} /> 11</span><span><Signal size={13} /> 4G</span></>}</span>
    </div>
    <div className="tactical-model">{vehicle.name} <span className="vehicle-energy" aria-label={`${isElectric ? 'Battery' : 'Fuel'}: ${vehicle.fuel}${offline ? ', last known' : ''}`} title={`${isElectric ? 'Battery' : 'Fuel'}: ${vehicle.fuel}${offline ? ', last known' : ''}`}>{isElectric ? <Battery size={14} aria-hidden="true" /> : <Fuel size={14} aria-hidden="true" />}{vehicle.fuel}{offline && <span className="energy-last-known"> last known</span>}</span></div>
    <div className="tactical-telemetry">{offline ? <span className="telemetry-stale">No recent data · last update {vehicle.updated} ago</span> : <VehicleSparkline speed={vehicle.speed} updatedAt={vehicle.updatedAt} vehicleId={vehicle.id} />}</div>
    <div className="tactical-address"><span>{offline ? 'Last known address' : 'Address'}</span><p>{address}</p></div>
    <div className="tactical-driver-row"><span>{offline ? 'Last assigned' : vehicle.status === 'idle' ? 'Last driven by' : 'Driver'}</span><b>{vehicle.driver}</b></div>
    <div className="card-bottom-row"><div className="driver-scores" aria-label="Driver scores"><span>Driving <b>{driverScore}/100</b></span><span>Fuel <b>{fuelScore}/100</b></span></div><div className="tactical-footer"><span className="tactical-time" title={timestamp}>{offline ? `${vehicle.updated} ago` : vehicle.updated}</span><button className="tactical-map" aria-label={`${offline ? 'Show last known position of' : 'Show'} ${vehicle.id} on map`} title={offline ? 'Show last known position on map' : 'Show on map'} onClick={() => onLocate(vehicle)}><MapIcon size={16} /></button></div></div>
    {!compact && <VehicleContext vehicle={vehicle} onSelect={onSelect} />}
  </div>;
}

function LocateVehicle({ target }) {
  const map = useMap();
  useEffect(() => { if (target) { map.stop(); map.setView(target.position, 16, { animate: false }); } }, [map, target]);
  return null;
}

function VehicleHoverCard({ vehicle }) {
  const offline = vehicle.sampleContext?.kind === 'offline';
  return <div className="hover-vehicle-card"><div className="hover-card-top"><div><b>{vehicle.id} · {vehicle.name}</b><span>{offline ? 'Last assigned: ' : vehicle.status === 'idle' ? 'Last driven by: ' : 'Driver: '}{vehicle.driver} · {offline ? 'Last known: ' : ''}{vehicle.location}</span></div><em className={vehicle.status}>{offline ? 'Tracker offline' : statusLabels[vehicle.status]}</em></div><div className="hover-card-stats"><span><Gauge size={12} />{offline ? `Last: ${vehicle.speed}` : vehicle.speed}</span><span><Fuel size={12} />{offline ? `Last: ${vehicle.fuel}` : vehicle.fuel}</span><span><Route size={12} />{vehicle.trip}</span><span><Clock3 size={12} />{vehicle.updated}</span></div></div>;
}

function MapControls() {
  const map = useMap();
  return <div className="map-controls"><button aria-label="Zoom in" onClick={() => map.zoomIn()}><Plus size={16} /></button><button aria-label="Zoom out" onClick={() => map.zoomOut()}><Minus size={16} /></button><button aria-label="Reset map position" onClick={() => map.setView([20, 0], 2)}><LocateFixed size={16} /></button></div>;
}

function MapResizeObserver() {
  const map = useMap();
  useEffect(() => {
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: true, debounceMoveend: true }));
    });
    observer.observe(map.getContainer());
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [map]);
  return null;
}

function FleetMap({ visibleVehicles, selectedId, onSelect, locateTarget, detailVehicle, playback, progress }) {
  return <div className="map-panel"><div className="map-canvas"><MapContainer center={[20, 0]} zoom={2} minZoom={2} maxZoom={17} zoomControl={false} attributionControl scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapResizeObserver /><ClusteredVehicles vehicles={visibleVehicles} onSelect={onSelect} /><PlaybackMap vehicle={detailVehicle} active={playback} progress={progress} /><LocateVehicle target={locateTarget} /><MapControls /></MapContainer></div></div>;
}

function LocationFilter({ location, onChange }) {
  const [open, setOpen] = useState(false);
  return <div className="location-filter" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector('.location-trigger')?.focus(); } }}>
    <span className="location-label" id="location-filter-label">Location</span>
    <button type="button" className="location-trigger" aria-labelledby="location-filter-label location-filter-value" aria-expanded={open} aria-controls="location-options" onClick={() => setOpen(value => !value)}><span id="location-filter-value">{location === 'all' ? 'All locations' : location}</span><ChevronDown size={15}/></button>
    {open && <div className="location-options" id="location-options" role="group" aria-label="Choose location">{[['all', 'All locations'], ...hubs.map(hub => [hub[2], hub[2]])].map(([value, label]) => <button type="button" key={value} aria-pressed={location === value} onClick={() => { onChange(value); setOpen(false); }}><span>{label}</span>{location === value && <Check size={15} aria-hidden="true"/>}</button>)}</div>}
  </div>;
}

function FleetWorkspace({ onNotice }) {
  const [panelWidth, setPanelWidth] = useState(30);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const clampWidth = value => Math.min(60, Math.max(20, value));
  const resizeFromPointer = event => {
    const left = event.currentTarget.parentElement.getBoundingClientRect().left;
    setPanelWidth(clampWidth(Math.round((event.clientX - left) / window.innerWidth * 1000) / 10));
  };
  const handleResizeKey = event => {
    const next = event.key === 'ArrowRight' ? panelWidth + 1 : event.key === 'ArrowLeft' ? panelWidth - 1 : event.key === 'Home' ? 20 : event.key === 'End' ? 60 : null;
    if (next !== null) { event.preventDefault(); setPanelWidth(clampWidth(next)); }
  };
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [location, setLocation] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [locateTarget, setLocateTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [playback, setPlayback] = useState(false);
  const [progress, setProgress] = useState(0);
  const openVehicle = useCallback(id => { setSelectedId(id); setDetailId(id); }, []);
  const detailVehicle = vehicles.find(vehicle => vehicle.id === detailId);
  const filtered = useMemo(() => vehicles.filter(vehicle => {
    const matchesFilter = filter === 'all' || vehicle.status === filter;
    const matchesQuery = [vehicle.id, vehicle.name, vehicle.driver, vehicle.location].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery && (location === 'all' || vehicle.location === location);
  }), [filter, query, location]);
  return <section className={`fleet-workspace ${resizing ? "is-resizing" : ""} ${panelCollapsed ? "is-panel-collapsed" : ""}`} style={{"--fleet-panel-width": `${panelWidth}vw`}}><aside id="fleet-panel" className="fleet-panel" aria-label="Fleet vehicles" hidden={panelCollapsed}><div className="fleet-search-row"><button className="icon-button subtle" aria-label="Filter options" aria-expanded={filtersOpen} aria-controls="fleet-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={15} /></button><button className="icon-button subtle view-toggle" aria-label={compactView ? "Switch to full view" : "Switch to compact view"} title={compactView ? "Switch to full view" : "Switch to compact view"} aria-pressed={compactView} onClick={() => setCompactView(view => !view)}>{compactView ? <ListChevronsUpDown size={16} /> : <ListChevronsDownUp size={16} />}</button><label className="search-field"><span className="sr-only">Search fleet</span><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search vehicle, driver or location" /><kbd>⌘ K</kbd></label></div><div id="fleet-filters" className="fleet-filter-panel" hidden={!filtersOpen}><div className="filter-panel-heading"><b>Filters</b><button onClick={() => { setLocation('all'); setFilter('all'); }}>Clear all</button></div><LocationFilter location={location} onChange={setLocation} /><p>{filtered.length} matching vehicles</p></div><div className="status-filters" role="group" aria-label="Filter vehicles by status">{[['all','All'],['moving','Moving'],['idle','Idle'],['alert','Alerts']].map(([key,label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><div className={`fleet-list ${compactView ? 'compact' : ''}`}>{filtered.slice(0, 100).map(vehicle => <VehicleRow key={vehicle.id} vehicle={vehicle} compact={compactView} selected={vehicle.id === selectedId} onSelect={openVehicle} onLocate={vehicle => { setSelectedId(vehicle.id); setLocateTarget({...vehicle}); }} />)}</div>{filtered.length === 0 && <div className="fleet-empty"><Search size={24} /><b>No vehicles found</b><p>Try a different search or status filter.</p></div>}</aside><button type="button" className="fleet-panel-toggle" aria-label={panelCollapsed ? "Expand fleet panel" : "Collapse fleet panel"} title={panelCollapsed ? "Expand fleet panel" : "Collapse fleet panel"} aria-controls="fleet-panel" aria-expanded={!panelCollapsed} onClick={() => setPanelCollapsed(value => !value)}>{panelCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><div className="fleet-resizer" role="separator" tabIndex={0} aria-label="Resize fleet panel" aria-controls="fleet-panel" aria-orientation="vertical" aria-valuemin={20} aria-valuemax={60} aria-valuenow={panelWidth} aria-valuetext={`${panelWidth}% of viewport width`} title="Drag to resize fleet panel" onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); setResizing(true); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeFromPointer(event); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); }} onLostPointerCapture={() => setResizing(false)} onKeyDown={handleResizeKey}><span aria-hidden="true" /></div><FleetMap visibleVehicles={filtered} selectedId={selectedId} onSelect={openVehicle} locateTarget={locateTarget} detailVehicle={detailVehicle} playback={playback} progress={progress} />{detailVehicle && <VehicleDetails key={detailVehicle.id} vehicle={detailVehicle} onClose={() => {setDetailId(null);setPlayback(false)}} onLocate={vehicle => setLocateTarget({...vehicle})} playback={playback} setPlayback={setPlayback} progress={progress} setProgress={setProgress} />}</section>;
}

function App({ onNotice }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  return <><MainNavigation onNotice={onNotice} /><main className="vayu-main" id="fleet"><section className="page-heading"><div><p className="breadcrumb">Management <span>/</span> Fleet Details & Map</p><div className="title-line"><h1>Fleet Details & Map</h1><button className={`bookmark-trigger ${bookmarked ? 'active' : ''}`} aria-label="Bookmark Fleet Details & Map" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button></div></div><div className="page-actions"><span className="last-updated"><i />Updated just now</span><button className="co-button" onClick={() => onNotice('Export will be available in a later step.')}><Download size={14} />Export</button><div className="more-menu-wrap" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setMoreOpen(false); event.currentTarget.querySelector('button')?.focus(); } }}><button className="co-icon-button" aria-label="More options" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={20} /></button>{moreOpen && <div className="more-menu" role="menu"><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Messages will be available in a later step.'); }}>Show messages</button><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Safety controls will be available in a later step.'); }}>Disable Safety</button></div>}</div></div></section><FleetWorkspace onNotice={onNotice} /></main></>;
}

function Root() {
  const [notice, setNotice] = useState('');
  const onNotice = message => { setNotice(message); window.clearTimeout(window.__vayuNotice); window.__vayuNotice = window.setTimeout(() => setNotice(''), 3000); };
  return <><App onNotice={onNotice} /><div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div></>;
}

createRoot(document.getElementById('root')).render(<Root />);
