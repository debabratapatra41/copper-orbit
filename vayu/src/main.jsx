import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, Circle, CircleMarker, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from './vayu-map-style.json';
import { ArrowUpRight, Battery, Bell, Bookmark, Check, ChevronDown, ChevronsUp, Clock3, CloudSun, Download, Filter, Fuel, Gauge, Globe2, Layers, ListChevronsDownUp, ListChevronsUpDown, LocateFixed, Map as MapIcon, MapPin, MapPinned, MessageSquare, Minus, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Route, Satellite, Signal, Search, ShieldAlert, TriangleAlert, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import '../../design-system.css';
import './styles.css';
import VehicleDetails, { PlaybackMap } from './VehicleDetails';
import VehicleSparkline from './VehicleSparkline';
import { simulateFleet } from './fleetSimulation';

setWorkerUrl(workerUrl);

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
const baseVehicles = Array.from({length: 3000}, (_, index) => {
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

const markerLabel = (vehicle, field) => field === 'driver' ? vehicle.driver : field === 'vin' ? (vehicle.vin || 'VIN unavailable') : field === 'type' ? vehicle.name : vehicle.id;
function ClusteredVehicles({ vehicles: items, onSelect, activeId, clustersReady = true, labels }) {
  const map = useMap();
  const markerMapRef = useRef(new Map());
  const currentVehiclesRef = useRef(new Map());
  const membershipKey = items.map(vehicle => vehicle.id).join(',');
  currentVehiclesRef.current = new Map(items.map(vehicle => [vehicle.id, vehicle]));
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const updateAppearance = (marker, vehicle) => {
    const el = marker.getElement();
    if (!el || !vehicle) return;
    const color = vehicle.status === 'moving' ? '#25734a' : vehicle.status === 'idle' ? '#b77900' : '#85827d';
    const body = el.querySelector('.moving-marker-body');
    const orbit = el.querySelector('.direction-orbit');
    const triangle = el.querySelector('.direction-triangle');
    const top = el.querySelector('.marker-label-top');
    const bottom = el.querySelector('.marker-label-bottom');
    el.classList.toggle('vehicle-live-moving', vehicle.status === 'moving');
    if (body) body.style.backgroundColor = color;
    if (orbit) orbit.style.transform = `rotate(${vehicle.heading ?? 0}deg)`;
    if (triangle) triangle.style.borderBottomColor = color;
    if (top) top.textContent = markerLabel(vehicle, labels.topField);
    if (bottom) bottom.textContent = markerLabel(vehicle, labels.bottomField);
  };

  useEffect(() => {
    if (!clustersReady) return;
    const cluster = L.markerClusterGroup({ maxClusterRadius: 55, disableClusteringAtZoom: 16, chunkedLoading: true, showCoverageOnHover: false });
    markerMapRef.current.clear();

    items.forEach(vehicle => {
      const isSelected = activeIdRef.current === vehicle.id;
      const color = vehicle.status === 'moving' ? '#25734a' : vehicle.status === 'idle' ? '#b77900' : '#85827d';
      const heading = vehicle.heading ?? 0;
      const markerHtml = renderToStaticMarkup(
        <div className="moving-marker">
          <div className="direction-orbit" style={{ transform: `rotate(${heading}deg)` }}>
            <i className="direction-triangle" style={{ borderBottomColor: color }} />
          </div>
          <div className="moving-marker-body" style={{ backgroundColor: color }}>
            <Truck size={16} />
          </div>
          {(labels.top || labels.bottom) && <div className="marker-label-stack">
            {labels.top && <div className="moving-marker-label marker-label-top">{markerLabel(vehicle, labels.topField)}</div>}
            {labels.bottom && <div className="moving-marker-label marker-label-bottom">{markerLabel(vehicle, labels.bottomField)}</div>}
          </div>}
        </div>
      );
      const marker = L.marker(vehicle.position, {
        icon: L.divIcon({
          className: `fleet-map-marker marker-id-${vehicle.id} ${isSelected ? 'is-active-vehicle' : ''}`,
          html: markerHtml,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        }),
        zIndexOffset: isSelected ? 1000 : 0
      });

      marker.on('add', () => {
        const el = marker.getElement();
        if (el) {
          if (activeIdRef.current === vehicle.id) {
            el.classList.add('is-active-vehicle');
          } else {
            el.classList.remove('is-active-vehicle');
          }
          updateAppearance(marker, currentVehiclesRef.current.get(vehicle.id));
        }
      });

      const content = document.createElement('div');
      content.innerHTML = renderToStaticMarkup(<VehicleHoverCard vehicle={vehicle} />);
      marker.bindTooltip(content, { direction: 'top', offset: [0, -10], className: 'vayu-tooltip' });
      marker.on('tooltipopen', () => {
        const current = currentVehiclesRef.current.get(vehicle.id);
        if (current) marker.setTooltipContent(renderToStaticMarkup(<VehicleHoverCard vehicle={current} />));
      });
      marker.on('click', () => onSelect(vehicle.id));

      markerMapRef.current.set(vehicle.id, marker);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    return () => { map.removeLayer(cluster); };
  }, [map, membershipKey, onSelect, clustersReady, labels]);

  useEffect(() => {
    if (!clustersReady) return;
    items.forEach(vehicle => {
      const marker = markerMapRef.current.get(vehicle.id);
      if (!marker) return;
      const current = marker.getLatLng();
      if (Math.abs(current.lat - vehicle.position[0]) > 0.0000001 || Math.abs(current.lng - vehicle.position[1]) > 0.0000001) marker.setLatLng(vehicle.position);
      updateAppearance(marker, vehicle);
    });
  }, [items, map, clustersReady]);

  // Fast active marker class toggle without re-clustering
  const prevActiveRef = useRef(null);
  useEffect(() => {
    if (prevActiveRef.current && prevActiveRef.current !== activeId) {
      const prevMarker = markerMapRef.current.get(prevActiveRef.current);
      if (prevMarker) {
        prevMarker.setZIndexOffset(0);
        const el = prevMarker.getElement();
        if (el) el.classList.remove('is-active-vehicle');
      }
    }
    if (activeId) {
      const nextMarker = markerMapRef.current.get(activeId);
      if (nextMarker) {
        nextMarker.setZIndexOffset(1000);
        const el = nextMarker.getElement();
        if (el) el.classList.add('is-active-vehicle');
      }
    }
    prevActiveRef.current = activeId;
  }, [activeId]);

  return null;
}

const statusLabels = { moving: 'Moving', idle: 'Idle', stopped: 'Stopped', alert: 'Alert' };

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

const sampleAddressesByCity = {
  Bengaluru: [
    'Plot 48, EPIP Zone, Industrial Area, Whitefield, Bengaluru - 560066',
    'Bay 12, Logistics Distribution Park, Outer Ring Road, Mahadevapura, Bengaluru - 560048',
    '72/B, Commercial Cargo Terminal, Electronic City Phase 1, Bengaluru - 560100',
    'Unit 14, Peenya Industrial Complex, 4th Phase, Peenya, Bengaluru - 560058',
    '105, Central Express Logistics Hub, Hosur Road, Bommanahalli, Bengaluru - 560068',
    '24, Freight Staging Yard, Near Goraguntepalya, Yeshwanthpur, Bengaluru - 560022'
  ],
  Delhi: [
    'Plot 42, Okhla Industrial Area Phase III, New Delhi - 110020',
    'Warehouse 8, Transport Nagar, Samalka, New Delhi - 110037',
    'Unit 19, Patparganj Industrial Area, East Delhi - 110092'
  ],
  Mumbai: [
    'Unit 18, MIDC Logistics Hub, Marol, Andheri East, Mumbai - 400093',
    'Bay 6, Central Freight Staging, Turbhe, Navi Mumbai - 400705',
    'Gate 3, Logistics Distribution Center, Bhiwandi, Mumbai - 421302'
  ]
};

function getVehicleAddress(vehicle) {
  const cityList = sampleAddressesByCity[vehicle.location];
  if (cityList && cityList.length > 0) {
    const idNum = parseInt(vehicle.id.replace(/\D/g, ''), 10) || 0;
    return cityList[idNum % cityList.length];
  }
  return `125, Central Logistics Avenue, Sector 4, ${vehicle.location}`;
}

function VehicleRow({ vehicle, selected, onSelect, onLocate, compact, distanceLabel }) {
  const address = getVehicleAddress(vehicle);
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
    <div className="tactical-driver-row"><span>{offline ? 'Last assigned' : vehicle.status === 'idle' || vehicle.status === 'stopped' ? 'Last driven by' : 'Driver'}</span><b>{vehicle.driver}</b></div>
    <div className="card-bottom-row"><div className="driver-scores" aria-label="Driver scores"><span>Driving <b>{driverScore}/100</b></span><span>Fuel <b>{fuelScore}/100</b></span></div><div className="tactical-footer"><span className="tactical-time" title={timestamp}>{offline ? `${vehicle.updated} ago` : vehicle.updated}</span><button className="tactical-map" aria-label={`${offline ? 'Show last known position of' : 'Show'} ${vehicle.id} on map`} title={offline ? 'Show last known position on map' : 'Show on map'} onClick={() => onLocate(vehicle)}><MapIcon size={16} /></button></div></div>
    {distanceLabel && <div className="nearby-distance"><MapPin size={12} aria-hidden="true" />{distanceLabel}</div>}
    {!compact && <VehicleContext vehicle={vehicle} onSelect={onSelect} />}
  </div>;
}

function centerInVisibleViewport(map, position, zoom = 16, animate = true, hasDetail = false) {
  if (!map || typeof map.getSize !== 'function' || !position) return;
  const mapSize = map.getSize();
  if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) return;

  const drawerEl = typeof document !== 'undefined' ? document.querySelector('.vehicle-details') : null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;

  let dx = 0;
  let dy = 0;

  if (drawerEl) {
    if (isMobile) {
      const drawerHeight = drawerEl.offsetHeight || 340;
      dy = Math.round(drawerHeight / 2);
    } else {
      const drawerWidth = drawerEl.offsetWidth || 440;
      dx = Math.round((drawerWidth + 12) / 2);
    }
  } else if (hasDetail) {
    if (isMobile) {
      dy = 170;
    } else {
      dx = Math.round((440 + 12) / 2);
    }
  }

  const targetZoom = zoom || map.getZoom() || 16;
  const pointPixel = map.project(position, targetZoom);
  const centerPixel = pointPixel.add([dx, dy]);
  const centerLatLng = map.unproject(centerPixel, targetZoom);

  map.stop();
  map.setView(centerLatLng, targetZoom, { animate });
}

function LocateVehicle({ target, detailVehicle, playback }) {
  const map = useMap();

  useEffect(() => {
    if (!target || playback) return;
    const run = () => centerInVisibleViewport(map, target.position, 16, true, Boolean(detailVehicle));
    run();
    const timer = setTimeout(run, 120);
    return () => clearTimeout(timer);
  }, [map, target, playback, detailVehicle?.id]);

  useEffect(() => {
    if (!detailVehicle || playback) return;
    const run = () => centerInVisibleViewport(map, detailVehicle.position, 16, true, true);
    run();
    const timer = setTimeout(run, 120);
    return () => clearTimeout(timer);
  }, [map, detailVehicle?.id, playback]);

  return null;
}

function VehicleHoverCard({ vehicle }) {
  const offline = vehicle.sampleContext?.kind === 'offline';
  return <div className="hover-vehicle-card"><div className="hover-card-top"><div><b>{vehicle.id} · {vehicle.name}</b><span>{offline ? 'Last assigned: ' : vehicle.status === 'idle' || vehicle.status === 'stopped' ? 'Last driven by: ' : 'Driver: '}{vehicle.driver} · {offline ? 'Last known: ' : ''}{vehicle.location}</span></div><em className={vehicle.status}>{offline ? 'Tracker offline' : statusLabels[vehicle.status]}</em></div><div className="hover-card-stats"><span><Gauge size={12} />{offline ? `Last: ${vehicle.speed}` : vehicle.speed}</span><span><Fuel size={12} />{offline ? `Last: ${vehicle.fuel}` : vehicle.fuel}</span><span><Route size={12} />{vehicle.trip}</span><span><Clock3 size={12} />{vehicle.updated}</span></div></div>;
}

function MapControls() {
  const map = useMap();
  return <div className="map-controls"><button aria-label="Zoom in" onClick={() => map.zoomIn()}><Plus size={16} /></button><button aria-label="Zoom out" onClick={() => map.zoomOut()}><Minus size={16} /></button><button aria-label="Reset map position" onClick={() => map.setView([20, 0], 2)}><LocateFixed size={16} /></button></div>;
}

function MapAttributionPosition() {
  const map = useMap();
  useEffect(() => { map.attributionControl?.setPosition('bottomleft'); }, [map]);
  return null;
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

function VayuBasemap({ satellite }) {
  const map = useMap();
  useEffect(() => {
    const attribution = '© <a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Routes by <a href="https://project-osrm.org/">OSRM</a>';
    let layer;
    try {
      if (satellite) {
        layer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Tiles © Esri' });
        layer.addTo(map);
      } else {
      layer = maplibreGL({ style: mapStyle, attributionControl: { customAttribution: attribution } });
      layer.addTo(map);
      }
    } catch (error) {
      console.warn('Vector map unavailable, using the standard OpenStreetMap layer.', error);
      layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(map);
    }
    return () => { if (layer && map.hasLayer(layer)) map.removeLayer(layer); };
  }, [map, satellite]);
  return null;
}

function MapEntranceController({ onMapZoomDone }) {
  const map = useMap();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Start with wider view (zoom 1.4)
    map.setView([20, 0], 1.4, { animate: false });

    // Rapidly fly/zoom into the operational view with minimal delay
    const timerFly = setTimeout(() => {
      map.flyTo([20, 10], 2, {
        duration: 0.55,
        easeLinearity: 0.35
      });
    }, 120);

    // After map finishes zooming in, trigger the cluster load and magnification
    const timerDone = setTimeout(() => {
      if (onMapZoomDone) onMapZoomDone();
    }, 650);

    return () => {
      clearTimeout(timerFly);
      clearTimeout(timerDone);
    };
  }, [map, onMapZoomDone]);

  return null;
}

function NearbyHoverMarker({ vehicle, reveal = true }) {
  const map = useMap();
  useEffect(() => {
    if (!vehicle?.position || !reveal) return;
    const point = map.latLngToContainerPoint(vehicle.position);
    const size = map.getSize();
    const drawer = document.querySelector('.vehicle-details');
    const mobile = window.innerWidth <= 760;
    const right = mobile ? size.x - 35 : size.x - (drawer?.offsetWidth || 0) - 35;
    const bottom = mobile ? size.y - (drawer?.offsetHeight || 0) - 35 : size.y - 35;
    if (point.x < 35 || point.x > right || point.y < 35 || point.y > bottom) centerInVisibleViewport(map, vehicle.position, map.getZoom(), true, true);
  }, [map, vehicle?.id, reveal]);
  if (!vehicle?.position) return null;
  const color = vehicle.status === 'moving' ? '#25734a' : vehicle.status === 'idle' ? '#b77900' : '#85827d';
  const icon = L.divIcon({ className: 'nearby-hover-marker', html: renderToStaticMarkup(<div className="moving-marker-body" style={{ backgroundColor: color }}><Truck size={16} /></div>), iconSize: [30, 30], iconAnchor: [15, 15] });
  return <Marker position={vehicle.position} icon={icon} interactive={false} zIndexOffset={2000}><Tooltip permanent direction="bottom" offset={[0, 18]} className="nearby-hover-label">{vehicle.id} · {vehicle.name}</Tooltip></Marker>;
}

function NearbyRouteMap({ route }) {
  const map = useMap();
  useEffect(() => {
    if (!route?.points?.length) return;
    const drawer = document.querySelector('.vehicle-details');
    const mobile = window.innerWidth <= 760;
    map.fitBounds(route.points, { paddingTopLeft: [40, 40], paddingBottomRight: mobile ? [40, (drawer?.offsetHeight || 300) + 24] : [(drawer?.offsetWidth || 440) + 24, 40], maxZoom: 16 });
  }, [map, route]);
  if (!route?.points?.length) return null;
  return <><Polyline positions={route.points} pathOptions={{ color: '#fff', weight: 8, opacity: 0.9, interactive: false }} /><Polyline positions={route.points} pathOptions={{ color: '#f36c2d', weight: 5, interactive: false }} /><CircleMarker center={route.points[0]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#25734a', fillOpacity: 1 }} /><CircleMarker center={route.points[route.points.length - 1]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#f36c2d', fillOpacity: 1 }} /></>;
}

function FleetMap({ visibleVehicles, selectedId, onSelect, locateTarget, detailVehicle, detailsClosing, playback, setPlayback, progress, setProgress, nearbyRoute, nearbyHover, nearbyDestination }) {
  const activeId = detailVehicle?.id;
  const [clustersReady, setClustersReady] = useState(false);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [labels, setLabels] = useState({ top: false, bottom: true, topField: 'driver', bottomField: 'id' });
  const example = visibleVehicles[0] || { id: 'VY-1001', driver: 'Aarav Sharma', name: 'Tata Ace EV' };
  const options = [['id','Vehicle ID'],['driver','Driver name'],['vin','VIN'],['type','Vehicle type']];

  const handleMapZoomDone = useCallback(() => {
    setClustersReady(true);
    setClustersLoading(true);
    setTimeout(() => {
      setClustersLoading(false);
    }, 700);
  }, []);

  return (
    <div className="map-panel">
      <div className={`map-canvas ${activeId ? 'has-active-vehicle' : ''} ${detailsClosing ? 'is-details-closing' : ''} ${clustersLoading ? 'initial-clusters-loading' : ''}`}>
        {activeId && (
          <style>{`
            .has-active-vehicle .fleet-map-marker:not(.marker-id-${activeId}) {
              opacity: 0.25 !important;
              filter: grayscale(0.4) !important;
            }
            .has-active-vehicle .fleet-map-marker:not(.marker-id-${activeId}):hover {
              opacity: 0.88 !important;
              filter: none !important;
              z-index: 500 !important;
            }
            .has-active-vehicle .fleet-map-marker.marker-id-${activeId} {
              opacity: 1 !important;
              filter: none !important;
              z-index: 1000 !important;
            }
            .has-active-vehicle .fleet-map-marker.marker-id-${activeId} .moving-marker-body {
              box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--accent) !important;
            }
            .has-active-vehicle .marker-cluster {
              opacity: 0.35 !important;
            }
            .has-active-vehicle .marker-cluster:hover {
              opacity: 0.9 !important;
            }
          `}</style>
        )}
        <MapContainer center={[20, 0]} zoom={1.4} minZoom={1} maxZoom={17} zoomControl={false} attributionControl scrollWheelZoom>
          <MapAttributionPosition />
          <VayuBasemap satellite={satellite} />
          <MapResizeObserver />
          <MapEntranceController onMapZoomDone={handleMapZoomDone} />
          {!playback && <ClusteredVehicles vehicles={visibleVehicles} onSelect={onSelect} activeId={activeId} clustersReady={clustersReady || Boolean(detailVehicle)} labels={labels} />}
          <NearbyRouteMap route={nearbyRoute} />
          {!playback && <NearbyHoverMarker vehicle={nearbyDestination} reveal={false} />}
          {!playback && nearbyHover?.id !== nearbyDestination?.id && <NearbyHoverMarker vehicle={nearbyHover} />}
          <PlaybackMap vehicle={detailVehicle} active={playback} progress={progress} setProgress={setProgress} setPlayback={setPlayback} />
          <LocateVehicle target={locateTarget} detailVehicle={detailVehicle} playback={playback} />
          <MapControls />
        </MapContainer>
        <div className="map-display-controls">
          <button type="button" className="map-display-button map-style-button" aria-label={satellite ? 'Switch to normal map' : 'Switch to satellite map'} title={satellite ? 'Switch to normal map' : 'Switch to satellite map'} aria-pressed={satellite} onClick={() => setSatellite(value => !value)}><Globe2 size={19} /></button>
          <button type="button" className="map-display-button map-style-button" aria-label="Map layers" aria-expanded={layersOpen} aria-controls="map-label-settings" title="Map layers" onClick={() => setLayersOpen(value => !value)}><Layers size={19} /></button>
          <button type="button" className="map-display-button map-style-button" aria-label="Weather" aria-disabled="true" title="Weather"><CloudSun size={19} /></button>
          <button type="button" className="map-display-button map-style-button" aria-label="Geofence" aria-disabled="true" title="Geofence"><MapPinned size={19} /></button>
          {layersOpen && <section className="map-label-panel" id="map-label-settings" aria-label="Map layers" onKeyDown={event => { if (event.key === 'Escape') { setLayersOpen(false); document.querySelector('.map-display-button[aria-controls]')?.focus(); } }}>
            <div className="map-label-heading"><div><b>Map layers</b><span>Customize vehicle markers</span></div><button type="button" aria-label="Close map layers" onClick={() => setLayersOpen(false)}>×</button></div>
            <div className="marker-preview" aria-label="Vehicle marker preview"><div className="preview-caption">MARKER PREVIEW</div><div className="marker-preview-content"><span className="preview-truck"><Truck size={16} /></span>{(labels.top || labels.bottom) && <span className="preview-label-box">{labels.top && <span className="preview-label">{markerLabel(example, labels.topField)}</span>}{labels.bottom && <span className="preview-label">{markerLabel(example, labels.bottomField)}</span>}</span>}</div></div>
            <p className="map-label-help">Choose the top and bottom lines shown below each vehicle.</p>
            {['top','bottom'].map(position => <div className="map-label-row" key={position}><label className="map-label-toggle"><span>{position === 'top' ? 'Top label' : 'Bottom label'}</span><input type="checkbox" checked={labels[position]} onChange={event => setLabels(old => ({...old, [position]: event.target.checked}))} /></label><select aria-label={`${position === 'top' ? 'Top' : 'Bottom'} label content`} disabled={!labels[position]} value={labels[`${position}Field`]} onChange={event => setLabels(old => ({...old, [`${position}Field`]: event.target.value}))}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></div>)}
            <p className="map-label-footnote">Labels appear when vehicles are visible on the map. VIN is shown when available.</p>
          </section>}
        </div>
      </div>
    </div>
  );
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
  const [simulationTime, setSimulationTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSimulationTime(Date.now()), 2000);
    return () => window.clearInterval(timer);
  }, []);
  const vehicles = useMemo(() => simulateFleet(baseVehicles, Math.max(0, (simulationTime - sampleTime) / 1000), simulationTime), [simulationTime]);
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const [mapVehicles, setMapVehicles] = useState(vehicles);
  useEffect(() => {
    const timer = window.setInterval(() => setMapVehicles(vehiclesRef.current), 10000);
    return () => window.clearInterval(timer);
  }, []);
  const [panelWidth, setPanelWidth] = useState(25);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [resizing, setResizing] = useState(false);
  const clampWidth = value => Math.min(60, Math.max(15, value));
  const resizeFromPointer = event => {
    const left = event.currentTarget.parentElement.getBoundingClientRect().left;
    setPanelWidth(clampWidth(Math.round((event.clientX - left) / window.innerWidth * 1000) / 10));
  };
  const handleResizeKey = event => {
    const next = event.key === 'ArrowRight' ? panelWidth + 1 : event.key === 'ArrowLeft' ? panelWidth - 1 : event.key === 'Home' ? 25 : event.key === 'End' ? 60 : null;
    if (next !== null) { event.preventDefault(); setPanelWidth(clampWidth(next)); }
  };
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [location, setLocation] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [locateTarget, setLocateTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailsClosing, setDetailsClosing] = useState(false);
  const closeTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const cancelDetailClose = () => { window.clearTimeout(closeTimer.current); setDetailsClosing(false); };
  const closeDetails = () => {
    if (detailsClosing) return;
    setDetailsClosing(true);
    setNearbyRoute(null);
    setNearbyHover(null);
    setNearbyDestination(null);
    setPlayback(false);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320;
    closeTimer.current = window.setTimeout(() => { setDetailId(null); setDetailsClosing(false); }, duration);
  };
  const [demoCredits, setDemoCredits] = useState(1000);
  const [nearbyRoute, setNearbyRoute] = useState(null);
  const [nearbyHover, setNearbyHover] = useState(null);
  const [nearbyDestination, setNearbyDestination] = useState(null);
  const [playback, setPlayback] = useState(false);
  const [progress, setProgress] = useState(0);
  const openVehicle = useCallback(id => {
    window.clearTimeout(closeTimer.current);
    setDetailsClosing(false);
    setNearbyRoute(null);
    setNearbyHover(null);
    setNearbyDestination(null);
    setSelectedId(id);
    setDetailId(id);
    const v = vehiclesRef.current.find(vehicle => vehicle.id === id);
    if (v) {
      setLocateTarget({ ...v, _ts: Date.now() });
    }
  }, []);
  const detailVehicle = vehicles.find(vehicle => vehicle.id === detailId);
  const matchesVehicle = useCallback(vehicle => {
    const matchesFilter = filter === 'all' || (filter === 'alert' ? vehicle.hasAlert : vehicle.status === filter);
    const matchesQuery = [vehicle.id, vehicle.name, vehicle.driver, vehicle.location].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery && (location === 'all' || vehicle.location === location);
  }, [filter, query, location]);
  const filtered = useMemo(() => vehicles.filter(matchesVehicle), [vehicles, matchesVehicle]);
  const filteredMap = useMemo(() => mapVehicles.filter(matchesVehicle), [mapVehicles, matchesVehicle]);
  return <section className={`fleet-workspace ${resizing ? "is-resizing" : ""} ${panelCollapsed ? "is-panel-collapsed" : ""}`} style={{"--fleet-panel-width": `max(200px, ${panelWidth}vw)`}}><aside id="fleet-panel" className="fleet-panel" aria-label="Fleet vehicles" hidden={panelCollapsed}><div className="fleet-search-row"><button className="icon-button subtle" aria-label="Filter options" aria-expanded={filtersOpen} aria-controls="fleet-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={15} /></button><button className="icon-button subtle view-toggle" aria-label={compactView ? "Switch to full view" : "Switch to compact view"} title={compactView ? "Switch to full view" : "Switch to compact view"} aria-pressed={compactView} onClick={() => setCompactView(view => !view)}>{compactView ? <ListChevronsUpDown size={16} /> : <ListChevronsDownUp size={16} />}</button><label className="search-field"><span className="sr-only">Search fleet</span><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search vehicle, driver or location" /><kbd>⌘ K</kbd></label></div><div id="fleet-filters" className="fleet-filter-panel" hidden={!filtersOpen}><div className="filter-panel-heading"><b>Filters</b><button onClick={() => { setLocation('all'); setFilter('all'); }}>Clear all</button></div><LocationFilter location={location} onChange={setLocation} /><p>{filtered.length} matching vehicles</p></div><div className="status-filters" role="group" aria-label="Filter vehicles by status">{[['all','All'],['moving','Moving'],['idle','Idle'],['stopped','Stopped'],['alert','Alerts']].map(([key,label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><div className={`fleet-list ${compactView ? 'compact' : ''}`}>{filtered.slice(0, 100).map(vehicle => <VehicleRow key={vehicle.id} vehicle={vehicle} compact={compactView} selected={vehicle.id === selectedId} onSelect={openVehicle} onLocate={vehicle => { cancelDetailClose(); setSelectedId(vehicle.id); setDetailId(vehicle.id); setLocateTarget({...vehicle, _ts: Date.now()}); }} />)}</div>{filtered.length === 0 && <div className="fleet-empty"><Search size={24} /><b>No vehicles found</b><p>Try a different search or status filter.</p></div>}</aside><button type="button" className="fleet-panel-toggle" aria-label={panelCollapsed ? "Expand fleet panel" : "Collapse fleet panel"} title={panelCollapsed ? "Expand fleet panel" : "Collapse fleet panel"} aria-controls="fleet-panel" aria-expanded={!panelCollapsed} onClick={() => setPanelCollapsed(value => !value)}>{panelCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><div className="fleet-resizer" role="separator" tabIndex={0} aria-label="Resize fleet panel" aria-controls="fleet-panel" aria-orientation="vertical" aria-valuemin={20} aria-valuemax={60} aria-valuenow={panelWidth} aria-valuetext={`${panelWidth}% of viewport width`} title="Drag to resize fleet panel" onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); setResizing(true); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeFromPointer(event); }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); }} onLostPointerCapture={() => setResizing(false)} onKeyDown={handleResizeKey}><span aria-hidden="true" /></div><FleetMap visibleVehicles={filteredMap} selectedId={selectedId} onSelect={openVehicle} locateTarget={locateTarget} detailVehicle={detailVehicle} detailsClosing={detailsClosing} playback={playback} setPlayback={setPlayback} progress={progress} setProgress={setProgress} nearbyRoute={nearbyRoute} nearbyHover={nearbyHover} nearbyDestination={nearbyDestination} />{detailVehicle && <VehicleDetails key={detailVehicle.id} vehicle={detailVehicle} fleetVehicles={mapVehicles} onNearbyRoute={setNearbyRoute} onNearbyHover={setNearbyHover} onNearbyDestination={setNearbyDestination} renderNearbyVehicle={(nearby, distanceLabel, onChoose) => <VehicleRow vehicle={nearby} distanceLabel={distanceLabel} compact selected={false} onSelect={onChoose} onLocate={onChoose} />} closing={detailsClosing} onClose={closeDetails} onLocate={vehicle => setLocateTarget({...vehicle, _ts: Date.now()})} playback={playback} setPlayback={setPlayback} progress={progress} setProgress={setProgress} demoCredits={demoCredits} setDemoCredits={setDemoCredits} />}</section>;
}

function App({ onNotice }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    document.body.classList.add('page-entrance-active');
    const timer = setTimeout(() => {
      document.body.classList.remove('page-entrance-active');
    }, 1200);
    return () => {
      document.body.classList.remove('page-entrance-active');
      clearTimeout(timer);
    };
  }, []);

  return <><MainNavigation onNotice={onNotice} /><main className="vayu-main" id="fleet"><section className="page-heading"><div><p className="breadcrumb">Management <span>/</span> Fleet Details & Map</p><div className="title-line"><h1>Fleet Details & Map</h1><button className={`bookmark-trigger ${bookmarked ? 'active' : ''}`} aria-label="Bookmark Fleet Details & Map" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button></div></div><div className="page-actions"><span className="last-updated"><i />Updated just now</span><button className="co-button" onClick={() => onNotice('Export will be available in a later step.')}><Download size={14} />Export</button><div className="more-menu-wrap" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setMoreOpen(false); event.currentTarget.querySelector('button')?.focus(); } }}><button className="co-icon-button" aria-label="More options" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={20} /></button>{moreOpen && <div className="more-menu" role="menu"><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Messages will be available in a later step.'); }}><MessageSquare size={15} /><span>Show messages</span></button><button role="menuitem" onClick={() => { setMoreOpen(false); onNotice('Safety controls will be available in a later step.'); }}><ShieldAlert size={15} /><span>Disable Safety</span></button></div>}</div></div></section><FleetWorkspace onNotice={onNotice} /></main></>;
}

function Root() {
  const [notice, setNotice] = useState('');
  const onNotice = message => { setNotice(message); window.clearTimeout(window.__vayuNotice); window.__vayuNotice = window.setTimeout(() => setNotice(''), 3000); };
  return <><App onNotice={onNotice} /><div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice}</div></>;
}

createRoot(document.getElementById('root')).render(<Root />);
