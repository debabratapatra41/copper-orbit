import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { Bell, Bookmark, ChevronDown, Clock3, Download, Filter, Fuel, Gauge, LocateFixed, Map as MapIcon, MapPin, Minus, MoreHorizontal, Plus, Route, Search, TriangleAlert, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './styles.css';

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
  return {...seed, driver: `${firstNames[driverIndex % firstNames.length]} ${lastNames[Math.floor(driverIndex / firstNames.length)]}`, updatedAt: new Date(sampleTime - (parseInt(seed.updated, 10) || 0) * 60000), id: `VY-${String(index + 1001).padStart(4,'0')}`, location: hub[2], position: [hub[0] + Math.sin(n * 12.989 + index) * (0.04 + (n % 10) * 0.025), hub[1] + Math.cos(n * 7.31 + index) * (0.04 + (n % 10) * 0.025)]};
});

function ClusteredVehicles({vehicles: items, onSelect}) {
  const map = useMap();
  useEffect(() => {
    const cluster = L.markerClusterGroup({maxClusterRadius: 55, chunkedLoading: true});
    items.forEach(vehicle => {
      const color = vehicle.status === 'moving' ? '#25734a' : vehicle.status === 'alert' ? '#bd3d40' : '#8d8b86';
      const marker = L.marker(vehicle.position, {icon: L.divIcon({className:'fleet-map-marker', html:`<span style="background:${color}"></span>`, iconSize:[20,20]})});
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

function VehicleRow({ vehicle, selected, onSelect, onLocate }) {
  return <div className={`vehicle-row ${selected ? 'active' : ''}`}><button className="vehicle-select" onClick={() => onSelect(vehicle.id)} aria-pressed={selected}><span className="vehicle-card-icon" aria-hidden="true"><Truck size={16} /></span><span className="vehicle-main"><span className="vehicle-title"><b>{vehicle.id}</b><span className={`vehicle-status ${vehicle.status}`}>{statusLabels[vehicle.status]}</span></span><span>{vehicle.location}</span><span>{vehicle.name}</span><span className="driver-line">{vehicle.status === 'idle' ? 'Last driven by: ' : 'Driver: '}{vehicle.driver}</span></span><span className="vehicle-meta"><b>{vehicle.speed}</b><span title={vehicle.updatedAt.toLocaleString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"}>{vehicle.updated}</span></span></button><button className="vehicle-locate" aria-label={`Show ${vehicle.id} on map`} title="Show on map" onClick={() => onLocate(vehicle)}><MapIcon size={16} /></button></div>;
}

function LocateVehicle({ target }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target.position, 16); }, [map, target]);
  return null;
}

function VehicleHoverCard({ vehicle }) {
  return <div className="hover-vehicle-card"><div className="hover-card-top"><div><b>{vehicle.id} · {vehicle.name}</b><span>{vehicle.status === 'idle' ? 'Last driven by: ' : 'Driver: '}{vehicle.driver} · {vehicle.location}</span></div><em className={vehicle.status}>{statusLabels[vehicle.status]}</em></div><div className="hover-card-stats"><span><Gauge size={12} />{vehicle.speed}</span><span><Fuel size={12} />{vehicle.fuel}</span><span><Route size={12} />{vehicle.trip}</span><span><Clock3 size={12} />{vehicle.updated}</span></div></div>;
}

function MapControls() {
  const map = useMap();
  return <div className="map-controls"><button aria-label="Zoom in" onClick={() => map.zoomIn()}><Plus size={16} /></button><button aria-label="Zoom out" onClick={() => map.zoomOut()}><Minus size={16} /></button><button aria-label="Reset map position" onClick={() => map.setView([20, 0], 2)}><LocateFixed size={16} /></button></div>;
}

function FleetMap({ visibleVehicles, selectedId, onSelect, locateTarget }) {
  return <div className="map-panel"><div className="map-toolbar"><div><b>Global fleet operations</b><span>OpenStreetMap · live vehicle positions</span></div><div className="map-legend"><span><i className="moving" />Moving</span><span><i className="idle" />Idle</span><span><i className="alert" />Alert</span></div></div><div className="map-canvas"><MapContainer center={[20, 0]} zoom={2} minZoom={2} maxZoom={17} zoomControl={false} attributionControl scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ClusteredVehicles vehicles={visibleVehicles} onSelect={onSelect} /><LocateVehicle target={locateTarget} /><MapControls /></MapContainer></div><div className="map-footer"><span><span className="map-selected-dot" />{selectedId ? `Selected ${selectedId}` : 'Select a vehicle'}</span><span>Sample fleet positions</span></div></div>;
}

function FleetWorkspace({ onNotice }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [location, setLocation] = useState('all');
  const [selectedId, setSelectedId] = useState(vehicles[0].id);
  const [locateTarget, setLocateTarget] = useState(null);
  const filtered = useMemo(() => vehicles.filter(vehicle => {
    const matchesFilter = filter === 'all' || vehicle.status === filter;
    const matchesQuery = [vehicle.id, vehicle.name, vehicle.driver, vehicle.location].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery && (location === 'all' || vehicle.location === location);
  }), [filter, query, location]);
  return <section className="fleet-workspace"><aside className="fleet-panel" aria-label="Fleet vehicles"><div className="fleet-search-row"><button className="icon-button subtle" aria-label="Filter options" aria-expanded={filtersOpen} aria-controls="fleet-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={15} /></button><label className="search-field"><span className="sr-only">Search fleet</span><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search vehicle, driver or location" /><kbd>⌘ K</kbd></label></div><div id="fleet-filters" className="fleet-filter-panel" hidden={!filtersOpen}><div className="filter-panel-heading"><b>Filters</b><button onClick={() => { setLocation('all'); setFilter('all'); }}>Clear all</button></div><label>Location<select value={location} onChange={event => setLocation(event.target.value)}><option value="all">All locations</option>{hubs.map(hub => <option key={hub[2]} value={hub[2]}>{hub[2]}</option>)}</select></label><p>{filtered.length} matching vehicles</p></div><div className="status-filters" role="group" aria-label="Filter vehicles by status">{[['all','All',vehicles.length],['moving','Moving',vehicles.filter(v => v.status === 'moving').length],['idle','Idle',vehicles.filter(v => v.status === 'idle').length],['alert','Alerts',vehicles.filter(v => v.status === 'alert').length]].map(([key,label,count]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label} <span>{count}</span></button>)}</div><div className="fleet-list">{filtered.slice(0, 100).map(vehicle => <VehicleRow key={vehicle.id} vehicle={vehicle} selected={vehicle.id === selectedId} onSelect={setSelectedId} onLocate={vehicle => { setSelectedId(vehicle.id); setLocateTarget({...vehicle}); }} />)}</div>{filtered.length === 0 && <div className="fleet-empty"><Search size={24} /><b>No vehicles found</b><p>Try a different search or status filter.</p></div>}</aside><FleetMap visibleVehicles={filtered} selectedId={selectedId} onSelect={setSelectedId} locateTarget={locateTarget} /></section>;
}

function App({ onNotice }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  return <><MainNavigation onNotice={onNotice} /><main className="vayu-main" id="fleet"><section className="page-heading"><div><p className="breadcrumb">Management <span>/</span> Fleet Details & Map</p><div className="title-line"><h1>Fleet Details & Map</h1><button className={`bookmark-trigger ${bookmarked ? 'active' : ''}`} aria-label="Bookmark Fleet Details & Map" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button></div></div><div className="page-actions"><span className="last-updated"><i />Updated just now</span><button className="button secondary" onClick={() => onNotice('Export will be available in a later step.')}><Download size={14} />Export</button><div className="more-menu-wrap" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setMoreOpen(false); event.currentTarget.querySelector('button')?.focus(); } }}><button className="more-trigger" aria-label="More options" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={20} /></button>{moreOpen && <div className="more-menu" role="menu"><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Messages will be available in a later step.'); }}>Show messages</button><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Safety controls will be available in a later step.'); }}>Disable Safety</button></div>}</div></div></section><FleetWorkspace onNotice={onNotice} /></main></>;
}

function Root() {
  const [notice, setNotice] = useState('');
  const onNotice = message => { setNotice(message); window.clearTimeout(window.__vayuNotice); window.__vayuNotice = window.setTimeout(() => setNotice(''), 3000); };
  return <><App onNotice={onNotice} /><div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div></>;
}

createRoot(document.getElementById('root')).render(<Root />);
