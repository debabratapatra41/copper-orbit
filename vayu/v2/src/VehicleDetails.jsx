import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LiveDashcam from './LiveDashcam';
import VehicleRecords from './VehicleRecords';
import DriverELD from './DriverELD';
import VehicleTelematics from './VehicleTelematics';
import VehicleFaults from './VehicleFaults';
import { getNearbyRoadRoute, getRoadReplay } from './fleetSimulation';
import { CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import {
  Activity,
  Battery,
  Fuel,
  Map as MapIcon,
  MapPin,
  UserRound,
  Search,
  UsersRound,
  Video,
  Wrench,
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  History,
  Layers,
  Maximize2,
  Play,
  Pause,
  X,
  Zap
} from 'lucide-react';
import {
  getTripTelemetry,
  DashcamHoverCard,
  DashcamStudioModal,
  DashcamScrubberPreview,
  projectLatLngToRoute,
  getRouteMetrics,
  getCoordinateAtProgress
} from './DashcamInspector';

function getDrawerOffset() {
  // The details panel occupies the separate left column, outside the map.
  const isMobile = window.innerWidth <= 1024;
  const drawerSize = isMobile ? (document.querySelector('.vehicle-details')?.offsetHeight || 0) : 0;
  return { paddingTopLeft: [48, 48], paddingBottomRight: [48, drawerSize + 24], isMobile, drawerSize };
}

function generateSmoothPath(pts, getX, getY) {
  if (!pts || pts.length === 0) return '';
  let d = `M ${getX(pts[0])} ${getY(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX1 = getX(prev) + (getX(curr) - getX(prev)) / 2;
    const cpY1 = getY(prev);
    const cpX2 = getX(prev) + (getX(curr) - getX(prev)) / 2;
    const cpY2 = getY(curr);
    d += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${getX(curr).toFixed(1)} ${getY(curr).toFixed(1)}`;
  }
  return d;
}

export function PlaybackMap({ vehicle, progress, active, setProgress, setPlayback, selectedTrip = 'all' }) {
  const map = useMap();
  const telemetry = useMemo(() => {
    return vehicle ? getTripTelemetry(vehicle.id) : null;
  }, [vehicle?.id]);

  const [hoveredState, setHoveredState] = useState(null);
  const [studioProgress, setStudioProgress] = useState(null);
  const hoverLeaveTimerRef = useRef(null);

  // Freeze the road section when this vehicle is selected, so live updates do not move the replay.
  const fullRoute = useMemo(() => getRoadReplay(vehicle), [vehicle?.id]);
  const points = useMemo(() => {
    if (selectedTrip === 'all' || fullRoute.length < 2) return fullRoute;
    const tripIndex = Number(selectedTrip.split('#')[1]);
    if (!Number.isInteger(tripIndex) || tripIndex < 0 || tripIndex > 4) return fullRoute;
    const start = tripIndex * 20, end = start + 20;
    const { totalDist, cumDists } = getRouteMetrics(fullRoute);
    const between = fullRoute.filter((_, index) => cumDists[index] > totalDist * start / 100 && cumDists[index] < totalDist * end / 100);
    return [getCoordinateAtProgress(fullRoute, start), ...between, getCoordinateAtProgress(fullRoute, end)];
  }, [fullRoute, selectedTrip]);

  // Fit the whole route into the unobstructed visible viewport (avoiding drawer)
  useEffect(() => {
    if (!active || !points.length) return;

    const fit = () => {
      const { paddingTopLeft, paddingBottomRight } = getDrawerOffset();
      map.fitBounds(points, {
        paddingTopLeft,
        paddingBottomRight,
        maxZoom: 15
      });
    };

    fit();
    const timer = setTimeout(fit, 120);
    return () => clearTimeout(timer);
  }, [active, map, points]);

  // Interpolate vehicle position along the route
  const point = useMemo(() => {
    if (!points.length) return null;
    return getCoordinateAtProgress(points, progress);
  }, [points, progress]);

  // Keep moving vehicle inside the visible viewport during replay
  useEffect(() => {
    if (!active || !point || !points.length) return;
    if (!map || typeof map.getSize !== 'function') return;

    const mapSize = map.getSize();
    if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) return;

    const { isMobile, drawerSize } = getDrawerOffset();

    // Define safe visible area to the left of (or above) the vehicle details drawer
    const safeMinX = 40;
    const safeMaxX = mapSize.x - 40;
    const safeMinY = 40;
    const safeMaxY = isMobile ? Math.max(safeMinY + 100, mapSize.y - drawerSize - 24) : mapSize.y - 40;

    const containerPt = map.latLngToContainerPoint(point);

    const isOutsideSafeView = (
      containerPt.x < safeMinX ||
      containerPt.x > safeMaxX ||
      containerPt.y < safeMinY ||
      containerPt.y > safeMaxY
    );

    if (isOutsideSafeView) {
      const desiredX = (safeMinX + safeMaxX) / 2;
      const desiredY = (safeMinY + safeMaxY) / 2;
      const dx = (mapSize.x / 2) - desiredX;
      const dy = (mapSize.y / 2) - desiredY;

      const currentZoom = map.getZoom();
      const pointPixel = map.project(point, currentZoom);
      const targetCenterPixel = pointPixel.add([dx, dy]);
      const targetCenterLatLng = map.unproject(targetCenterPixel, currentZoom);

      map.panTo(targetCenterLatLng, { animate: true, duration: 0.28 });
    }
  }, [active, point, map, points.length]);

  // Route mouse hover handlers
  const handleRouteMouseMove = useCallback(e => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    const { pct, latlng: snapLatLng } = projectLatLngToRoute(points, e.latlng);
    const telemetryPt = telemetry?.points[pct] || null;
    if (!telemetryPt) return;

    const screenPt = map.latLngToContainerPoint(snapLatLng);
    setHoveredState(curr => ({
      pct,
      snapLatLng,
      telemetryPt,
      screenPt,
      isPinned: curr?.isPinned || false
    }));
  }, [points, telemetry, map]);

  const handleRouteMouseOut = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
    }
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoveredState(curr => (curr?.isPinned ? curr : null));
    }, 300);
  }, []);

  const handleRouteClick = useCallback(e => {
    const { pct } = projectLatLngToRoute(points, e.latlng);
    if (setProgress) setProgress(pct);
    if (setPlayback) setPlayback(true);
  }, [points, setProgress, setPlayback]);

  const handleMilestoneHover = useCallback((mPct, mCoord) => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    const telemetryPt = telemetry?.points[mPct] || null;
    if (!telemetryPt) return;
    const screenPt = map.latLngToContainerPoint(mCoord);
    setHoveredState({
      pct: mPct,
      snapLatLng: mCoord,
      telemetryPt,
      screenPt,
      isPinned: false
    });
  }, [telemetry, map]);

  const handleMilestoneClick = useCallback((mPct) => {
    if (setProgress) setProgress(mPct);
    if (setPlayback) setPlayback(true);
  }, [setProgress, setPlayback]);

  if (!active) return null;
  if (!points.length || !point) return <div className="road-route-status" role="status">Road route unavailable for this vehicle.</div>;

  const currentPt = telemetry?.points[progress] || null;
  const isAlertIncident = currentPt?.event && (currentPt.event.severity === 'alert' || currentPt.event.severity === 'warning');

  // Milestone points along the route
  const milestones = [
    { p: 0, label: 'Trip started', type: 'start' },
    { p: 12, label: 'Harsh acceleration', type: 'incident' },
    { p: 38, label: 'Stop', type: 'stop' },
    { p: 52, label: 'Speed limit exceeded', type: 'incident' },
    { p: 65, label: 'Harsh turn', type: 'geofence' },
    { p: 78, label: 'Harsh braking', type: 'incident' },
    { p: 100, label: 'Trip ended', type: 'end' }
  ];

  // Smart Tooltip Direction
  const mapSize = typeof map.getSize === 'function' ? map.getSize() : { x: 1000, y: 800 };
  const isNearTop = hoveredState ? hoveredState.screenPt.y < 420 : false;
  const isNearRight = hoveredState ? hoveredState.screenPt.x > (mapSize.x - 440) : false;
  let tooltipDirection = 'top';
  let tooltipOffset = [0, -18];
  if (isNearRight && !isNearTop) {
    tooltipDirection = 'left';
    tooltipOffset = [-18, 0];
  } else if (isNearTop) {
    tooltipDirection = 'bottom';
    tooltipOffset = [0, 18];
  }

  return (
    <>
      {/* 1. Route Polylines */}
      {/* Casing polyline for maximum contrast */}
      <Polyline
        positions={points}
        pathOptions={{
          color: '#ffffff',
          weight: 7.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />
      {/* Primary signal orange polyline */}
      <Polyline
        positions={points}
        pathOptions={{
          color: '#f36c2d',
          weight: 4.5,
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />
      {/* Invisible wide hit-test polyline (36px wide for effortless hover) */}
      <Polyline
        positions={points}
        pathOptions={{
          color: '#f36c2d',
          weight: 36,
          opacity: 0
        }}
        eventHandlers={{
          mouseover: handleRouteMouseMove,
          mousemove: handleRouteMouseMove,
          mouseout: handleRouteMouseOut,
          click: handleRouteClick
        }}
      />

      {/* 2. Interactive Milestone Beads along the route */}
      {milestones.map(m => {
        const mCoord = getCoordinateAtProgress(points, m.p);
        if (!mCoord) return null;
        const isSelected = progress === m.p;
        const isHovered = hoveredState?.pct === m.p;
        const isInc = m.type === 'incident';

        return (
          <CircleMarker
            key={`milestone-${m.p}`}
            center={mCoord}
            radius={isHovered ? 7.5 : isInc ? 5.5 : 4.5}
            pathOptions={{
              color: isInc ? '#ef4444' : isSelected ? '#f36c2d' : '#fff',
              weight: isHovered ? 2.5 : 2,
              fillColor: isInc ? '#bd3d40' : isSelected ? '#f36c2d' : '#4b5563',
              fillOpacity: 1
            }}
            eventHandlers={{
              mouseover: () => handleMilestoneHover(m.p, mCoord),
              mouseout: handleRouteMouseOut,
              click: () => handleMilestoneClick(m.p)
            }}
          />
        );
      })}

      {/* 3. Start and end markers */}
      <CircleMarker
        center={points[0]}
        radius={5}
        pathOptions={{ color: '#6b7280', weight: 2.5, fillColor: '#fff', fillOpacity: 1 }}
      />
      <CircleMarker
        center={points[points.length - 1]}
        radius={5}
        pathOptions={{ color: '#d9551d', weight: 2.5, fillColor: '#fff', fillOpacity: 1 }}
      />

      {/* 4. Active Snap Cursor Reticle and Dashcam Tooltip */}
      {hoveredState && (
        <>
          {/* Snap Halo */}
          <CircleMarker
            interactive={false}
            center={hoveredState.snapLatLng}
            radius={15}
            pathOptions={{
              color: '#f36c2d',
              weight: 1.5,
              fillColor: '#f36c2d',
              fillOpacity: 0.25
            }}
          />
          {/* Snap Center Dot with Attached Dashcam Hover Card */}
          <CircleMarker
            interactive={false}
            center={hoveredState.snapLatLng}
            radius={6}
            pathOptions={{
              color: '#ffffff',
              weight: 2.5,
              fillColor: '#f36c2d',
              fillOpacity: 1
            }}
          >
            <Tooltip
              permanent
              direction={tooltipDirection}
              offset={tooltipOffset}
              className="vayu-tooltip dashcam-tooltip-wrap"
              opacity={1}
            >
              <DashcamHoverCard
                telemetryPt={hoveredState.telemetryPt}
                vehicle={vehicle}
                onSeek={p => {
                  if (setProgress) setProgress(p);
                  if (setPlayback) setPlayback(true);
                }}
                onOpenStudio={p => setStudioProgress(p)}
                onClose={() => setHoveredState(null)}
                isPinned={hoveredState.isPinned}
                onMouseEnter={() => {
                  if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
                }}
                onMouseLeave={handleRouteMouseOut}
              />
            </Tooltip>
          </CircleMarker>
        </>
      )}

      {/* 5. Replay vehicle halo & core */}
      <CircleMarker
        center={point}
        radius={isAlertIncident ? 22 : 14}
        pathOptions={{
          color: isAlertIncident ? '#ef4444' : '#f36c2d',
          weight: isAlertIncident ? 2 : 1.5,
          fillColor: isAlertIncident ? '#ef4444' : '#f36c2d',
          fillOpacity: isAlertIncident ? 0.25 : 0.2
        }}
      />
      <CircleMarker
        center={point}
        radius={8}
        pathOptions={{
          color: '#fff',
          weight: 2.5,
          fillColor: isAlertIncident ? '#bd3d40' : '#25734a',
          fillOpacity: 1
        }}
        eventHandlers={{
          mouseover: () => {
            const pt = telemetry?.points[progress];
            if (pt) {
              const screenPt = map.latLngToContainerPoint(point);
              setHoveredState({
                pct: progress,
                snapLatLng: point,
                telemetryPt: pt,
                screenPt,
                isPinned: false
              });
            }
          },
          click: () => {
            setStudioProgress(progress);
          }
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.95}>
          <span style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
            {vehicle.id} · {currentPt ? `${currentPt.speed} km/h` : ''} ({progress}%)
            {isAlertIncident ? ` · ${currentPt.event.badge || currentPt.event.label}` : ''}
          </span>
        </Tooltip>
      </CircleMarker>

      {/* 6. Fullscreen HD Dashcam Inspection Studio Modal */}
      {studioProgress !== null && (
        <DashcamStudioModal
          vehicle={vehicle}
          initialProgress={studioProgress}
          telemetry={telemetry}
          onClose={() => setStudioProgress(null)}
          onSyncReplay={p => {
            if (setProgress) setProgress(p);
            if (setPlayback) setPlayback(true);
          }}
        />
      )}
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

export default function VehicleDetails({ vehicle, mobileSheetHandle, onDetailsTabChange, onSelectedTripChange, fleetVehicles = [], renderNearbyVehicle, onNearbyRoute, onNearbyHover, onNearbyDestination, closing, onClose, onLocate, playback, setPlayback, progress, setProgress, demoCredits, setDemoCredits }) {
  const [detailsLoading, setDetailsLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setDetailsLoading(false), 500); return () => window.clearTimeout(timer); }, []);
  const [tab, setTab] = useState('overview');
  useEffect(() => { onDetailsTabChange(tab); }, [tab, onDetailsTabChange]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(5);
  const [nearbySelection, setNearbySelection] = useState(null);
  const detailsContentRef = useRef(null);
  const nearbyScrollRef = useRef(0);
  useEffect(() => { if (tab !== 'nearby') { setNearbySelection(null); onNearbyRoute(null); onNearbyHover(null); onNearbyDestination(null); } }, [tab, onNearbyRoute, onNearbyHover, onNearbyDestination]);
  const chooseNearby = target => {
    nearbyScrollRef.current = detailsContentRef.current?.scrollTop || 0;
    if (detailsContentRef.current) detailsContentRef.current.scrollTop = 0;
    onNearbyHover(null);
    const origin = fleetVehicles.find(item => item.id === vehicle.id) || vehicle;
    const route = getNearbyRoadRoute(origin, target);
    setNearbySelection({ target, route });
    onNearbyDestination(target);
    onNearbyRoute(route);
  };
  const nearbyVehicles = useMemo(() => {
    const origin = fleetVehicles.find(item => item.id === vehicle.id)?.position || vehicle.position;
    if (!origin) return [];
    const rad = value => value * Math.PI / 180;
    return fleetVehicles.filter(item => item.id !== vehicle.id && item.position).map(item => {
      const dLat = rad(item.position[0] - origin[0]);
      const dLon = rad(item.position[1] - origin[1]);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(origin[0])) * Math.cos(rad(item.position[0])) * Math.sin(dLon / 2) ** 2;
      return { vehicle: item, distance: 12742 * Math.asin(Math.min(1, Math.sqrt(a))) };
    }).filter(item => item.distance <= nearbyRadius).sort((a, b) => a.distance - b.distance);
  }, [fleetVehicles, vehicle.id, nearbyRadius]);
  const [selectedTrip, setSelectedTrip] = useState('all');
  useEffect(() => { onSelectedTripChange(selectedTrip); }, [selectedTrip, onSelectedTripChange]);
  const [tripMenuOpen, setTripMenuOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineSearchOpen, setTimelineSearchOpen] = useState(false);
  const timelineSearchRef = useRef(null);
  useEffect(() => { if (timelineSearchOpen) timelineSearchRef.current?.focus(); }, [timelineSearchOpen]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Telemetry graph state: 'speed' | 'gforce' | 'accel' | 'all' (disabled by default)
  const [showGraphs, setShowGraphs] = useState(false);
  const [telemetryMetric, setTelemetryMetric] = useState('speed');
  const [hoverProgress, setHoverProgress] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const graphRef = useRef(null);

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
    setTimelineFilter('all');
    setTimelineSearch('');
    setTimelineSearchOpen(false);
    setSelectedTrip('all');
    setPlaying(false);
    setProgress(0);
    setPlayback(false);
    setTelemetryMetric('speed');
    setHoverProgress(null);
    setIsDragging(false);
    setStartDate('2026-10-31');
    setEndDate('2026-10-31');
    setStartTime('00:00');
    setEndTime('23:59');
    setCalendarOpen(false);
    setShowGraphs(false);
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

  const openHistory = () => {
    if (tab !== 'history') openPlayback();
    setTab('history');
  };

  const selectedTripNumber = selectedTrip === 'all' ? 0 : Number(selectedTrip.split('#')[1] || 0);
  const seconds = (6 * 60 + selectedTripNumber * 150) * 60 + Math.round(progress * 69 * 60 / 100);
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(n => String(n).padStart(2, '0'))
    .join(':');

  // Telemetry data generator
  const telemetryData = useMemo(() => {
    const data = getTripTelemetry(vehicle.id);
    const points = data.points.map(point => {
      const value = (6 * 60 + selectedTripNumber * 150) * 60 + Math.round(point.progress * 69 * 60 / 100);
      const timeStr = [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(part => String(part).padStart(2, '0')).join(':');
      return { ...point, timeStr };
    });
    return { ...data, points, incidents: points.filter(point => point.event && point.event.type !== 'start' && point.event.type !== 'end') };
  }, [vehicle.id, selectedTripNumber]);

  const currentTelemetry = telemetryData.points[Math.min(100, Math.max(0, progress))] || telemetryData.points[0];
  const displayTelemetry = hoverProgress !== null
    ? (telemetryData.points[Math.min(100, Math.max(0, hoverProgress))] || currentTelemetry)
    : currentTelemetry;

  // Path coordinate scaling helpers
  const speedToY = useCallback(s => 126 - (Math.max(0, Math.min(65, s)) / 65) * 110, []);
  const gForceToY = useCallback(g => 126 - (Math.max(0, Math.min(0.50, g)) / 0.50) * 110, []);
  const accelToY = useCallback(a => 126 - ((Math.max(-4, Math.min(3, a)) + 4) / 7) * 110, []);

  const speedLinePath = useMemo(() => generateSmoothPath(telemetryData.points, p => p.progress * 10, p => speedToY(p.speed)), [telemetryData.points, speedToY]);
  const gForceLinePath = useMemo(() => generateSmoothPath(telemetryData.points, p => p.progress * 10, p => gForceToY(p.gForce)), [telemetryData.points, gForceToY]);
  const accelLinePath = useMemo(() => generateSmoothPath(telemetryData.points, p => p.progress * 10, p => accelToY(p.accel)), [telemetryData.points, accelToY]);

  const speedAreaPath = useMemo(() => `${speedLinePath} L 1000 126 L 0 126 Z`, [speedLinePath]);
  const gForceAreaPath = useMemo(() => `${gForceLinePath} L 1000 126 L 0 126 Z`, [gForceLinePath]);
  const accelAreaPath = useMemo(() => `${accelLinePath} L 1000 63.1 L 0 63.1 Z`, [accelLinePath]);

  // Thumb position along the active curve
  let activeThumbY = 126;
  if (telemetryMetric === 'speed') activeThumbY = speedToY(currentTelemetry.speed);
  else if (telemetryMetric === 'gforce') activeThumbY = gForceToY(currentTelemetry.gForce);
  else if (telemetryMetric === 'accel') activeThumbY = accelToY(currentTelemetry.accel);
  else activeThumbY = speedToY(currentTelemetry.speed);
  const thumbYPct = Math.round((activeThumbY / 140) * 100);

  const rafRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Graph drag & scrub handlers
  const updateProgressFromEvent = useCallback((e) => {
    if (!graphRef.current) return;
    const rect = graphRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = Math.round((x / rect.width) * 100);
    setProgress(pct);
  }, [setProgress]);

  const handleGraphPointerDown = useCallback((e) => {
    setPlaying(false);
    setIsDragging(true);
    updateProgressFromEvent(e);
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }, [updateProgressFromEvent]);

  const handleGraphPointerMove = useCallback((e) => {
    if (!graphRef.current) return;
    const rect = graphRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = Math.round((x / rect.width) * 100);
    if (isDragging) {
      setProgress(pct);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setHoverProgress(prev => (prev === pct ? prev : pct));
      });
    }
  }, [isDragging, setProgress]);

  const handleGraphPointerUp = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false);
      if (e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }
  }, [isDragging]);

  const handleGraphPointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!isDragging) {
      setHoverProgress(null);
    }
  }, [isDragging]);

  // Event pills horizontal scroll and drag-to-scroll handlers
  const pillsRowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollRef = useRef(0);
  const panMovedRef = useRef(false);

  const updateScrollButtons = useCallback(() => {
    const el = pillsRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 3);
  }, []);

  const handleScrollPills = useCallback((delta) => {
    const el = pillsRowRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 250);
  }, [updateScrollButtons]);

  const handlePillsWheel = useCallback((e) => {
    const el = pillsRowRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      updateScrollButtons();
    }
  }, [updateScrollButtons]);

  const handlePillMouseDown = useCallback((e) => {
    const el = pillsRowRef.current;
    if (!el) return;
    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    panStartScrollRef.current = el.scrollLeft;
    panMovedRef.current = false;
  }, []);

  const handlePillMouseMove = useCallback((e) => {
    if (!isPanningRef.current) return;
    const delta = e.clientX - panStartXRef.current;
    if (Math.abs(delta) > 3) {
      panMovedRef.current = true;
    }
    const el = pillsRowRef.current;
    if (el) {
      el.scrollLeft = panStartScrollRef.current - delta;
      updateScrollButtons();
    }
  }, [updateScrollButtons]);

  const handlePillMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = pillsRowRef.current;
    if (!el) return;
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollButtons, showGraphs, playback]);

  // Auto-scroll active event pill into view
  useEffect(() => {
    const el = pillsRowRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('.incident-pill.active');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setTimeout(updateScrollButtons, 300);
    }
  }, [progress, updateScrollButtons]);

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

  useEffect(() => { setSelectedTrip('all'); setTripMenuOpen(false); }, [startDate, endDate, startTime, endTime]);
  const formatMinutes = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const tripEventCategory = event => event.category;
  const availableTrips = activeDateKeys.flatMap(day => Array.from({ length: 5 }, (_, index) => {
    const startMinutes = 6 * 60 + index * 150;
    const duration = 69;
    const entries = [
      ['Trip started', 'Ignition on', 'trip'], ['Vehicle moving', 'Departed from starting point', 'trip'],
      ['Speed update', 'Speed recorded', 'trip'], ['Route update', 'Vehicle location recorded', 'trip'],
      ['Harsh acceleration', 'Rapid acceleration detected', 'alerts'], ['Speed update', 'Speed recorded', 'trip'],
      ['Route update', 'Vehicle location recorded', 'trip'], ['Speed update', 'Speed recorded', 'trip'],
      ['Harsh turn', 'Sharp turn detected', 'alerts'], ['Route update', 'Vehicle location recorded', 'trip'],
      ['Speed update', 'Speed recorded', 'trip'], ['Route update', 'Vehicle location recorded', 'trip'],
      ['Speed limit exceeded', 'Speed threshold exceeded', 'alerts'], ['Route update', 'Vehicle location recorded', 'trip'],
      ['Speed update', 'Speed recorded', 'trip'], ['Route update', 'Vehicle location recorded', 'trip'],
      ['Harsh braking', 'Sudden braking detected', 'alerts'], ['Speed update', 'Speed recorded', 'trip'],
      ['Route update', 'Vehicle location recorded', 'trip'], ['Speed update', 'Speed recorded', 'trip'],
      ['Route update', 'Vehicle location recorded', 'trip'], ['Vehicle slowing', 'Approaching the end of the trip', 'trip'],
      ['Vehicle stopped', 'Vehicle came to a stop', 'stops'], ['Trip ended', 'Ignition off', 'trip']
    ];
    return { id: `${day}#${index}`, day, index, start: formatMinutes(startMinutes), end: formatMinutes(startMinutes + duration), timeRange: `${formatMinutes(startMinutes)}–${formatMinutes(startMinutes + duration)}`, distance: (8.6 + index * 2.3 + (Number(vehicle.id.slice(3)) % 7) * 0.2), events: entries.map(([label, detail, category], position) => ({ label, detail, category, time: formatMinutes(startMinutes + position * 3), at: Math.round(position / (entries.length - 1) * 100) })) };
  })).filter(trip => isAllDay || (trip.end >= startTime && trip.start <= endTime));
  const selectedTripIndex = availableTrips.findIndex(trip => trip.id === selectedTrip);
  const selectedTripRecord = availableTrips[selectedTripIndex];
  const selectHistoryTrip = value => { setSelectedTrip(value); setProgress(0); setPlaying(false); setPlayback(true); setTripMenuOpen(false); };
  const visibleTrips = selectedTrip === 'all' ? availableTrips : availableTrips.filter(trip => trip.id === selectedTrip);
  const totalTripDistance = visibleTrips.reduce((total, trip) => total + trip.distance, 0);
  const alertCount = visibleTrips.reduce((total, trip) => total + trip.events.filter(event => tripEventCategory(event) === 'alerts' && (isAllDay || (event.time >= startTime && event.time <= endTime))).length, 0);

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

  if (detailsLoading) return <aside className={`vehicle-details details-loading ${closing ? 'is-closing' : ''}`} aria-label="Loading vehicle details" aria-busy="true">{mobileSheetHandle}<span className="sr-only">Loading vehicle details</span><div className="details-skeleton" aria-hidden="true"><div className="skeleton-block details-skeleton-title"/><div className="skeleton-block details-skeleton-tabs"/><div className="skeleton-block details-skeleton-status"/><div className="skeleton-block details-skeleton-section"/><div className="skeleton-block details-skeleton-section"/><div className="skeleton-block details-skeleton-section"/></div></aside>;

  return (
    <aside className={`vehicle-details details-loaded ${closing ? 'is-closing' : ''}`} aria-hidden={closing || undefined} inert={closing || undefined} aria-label={`Vehicle details for ${vehicle.id}`}>
      {mobileSheetHandle}
      {/* Header */}
      <div className="details-header">
        <div>
          <div className="details-identity-line"><h2>{vehicle.id}</h2><span className={`co-status co-status--${vehicle.status}`}>{offline ? 'tracker offline' : vehicle.status}</span></div>
          <p>{vehicle.name}</p>
        </div>
        <button className="co-icon-button" aria-label="Back to vehicles" title="Back to vehicles" onClick={onClose}><ChevronLeft size={20}/></button>
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
            onClick={openHistory}
          >
            <History size={14} strokeWidth={2} />
            <span>History</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'nearby'} className={`segmented-tab ${tab === 'nearby' ? 'active' : ''}`} onClick={() => { setTab('nearby'); setPlayback(false); setPlaying(false); }}>
            <UsersRound size={14} strokeWidth={2} /><span>Nearby vehicles</span>
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

      {/* Scrollable content area */}
      <div className={`details-content ${tab === 'history' ? 'details-content--history' : ''}`} ref={detailsContentRef}>
        {tab === 'overview' ? (
          <>
            <section className="live-summary" aria-label="Current vehicle status">
              <div className="live-summary-heading"><h3>Current status</h3><div className="live-summary-actions"><button type="button" className="co-icon-button" aria-label="Show on map" title="Show on map" onClick={() => onLocate(vehicle)}><MapIcon size={16} /></button><button type="button" className="co-icon-button" aria-label="View history" title="View history" onClick={openHistory}><History size={16} /></button></div></div>
              <div className="live-summary-grid">
                <div className="live-summary-item"><Gauge size={16} aria-hidden="true" /><span><small>{offline ? 'Last known speed' : 'Speed'}</small><b>{vehicle.speed}</b></span></div>
                <div className="live-summary-item">{/\bEV\b/i.test(vehicle.name) ? <Battery size={16} aria-hidden="true" /> : <Fuel size={16} aria-hidden="true" />}<span><small>{offline ? 'Last known energy' : /\bEV\b/i.test(vehicle.name) ? 'Battery' : 'Fuel'}</small><b>{vehicle.fuel}</b></span></div>
                <div className="live-summary-item"><MapPin size={16} aria-hidden="true" /><span><small>{offline ? 'Last known location' : 'Location'}</small><b title={vehicle.location}>{vehicle.location}</b></span></div>
                <div className="live-summary-item"><Clock size={16} aria-hidden="true" /><span><small>Last update</small><b>{vehicle.updated}</b></span></div>
              </div>
            </section>
            {vehicle.sampleContext && (
              <div className="detail-section">
                <h3>{vehicle.sampleContext.title ? 'Exception' : 'Trip'}</h3>
                {vehicle.sampleContext.job && <p><b>Job {vehicle.sampleContext.job.id} · Stop {vehicle.sampleContext.job.stop}</b><br />Next: {vehicle.sampleContext.job.nextStop}{vehicle.sampleContext.eta && <> · {vehicle.sampleContext.eta}</>}</p>}
                {vehicle.sampleContext.title && <p><b>{vehicle.sampleContext.title}</b><br />{vehicle.sampleContext.detail}</p>}
                <p>Live dispatch, diagnostic and tracker data is not connected.</p>
              </div>
            )}
            <details className="details-accordion">
              <summary className="accordion-heading"><span className="driver-details-icon"><Activity size={16} aria-hidden="true" /></span><span className="accordion-title"><b>Vehicle telematics</b><small>Vehicle, powertrain and sensor data</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              <VehicleTelematics vehicle={vehicle} />
            </details>
            <details className="details-accordion">
              <summary className="accordion-heading"><span className="driver-details-icon"><AlertTriangle size={16} aria-hidden="true" /></span><span className="accordion-title"><b>DTCs & fault codes</b><small>Diagnostic trouble codes and fault history</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              <VehicleFaults vehicle={vehicle} />
            </details>
            <details className="driver-details details-accordion">
              <summary className="accordion-heading"><span className="driver-details-icon"><UserRound size={16} aria-hidden="true" /></span><span className="accordion-title"><b>Driver details</b><small>{vehicle.driver || 'Driver unavailable'} · {offline ? 'Last assigned' : vehicle.status === 'idle' || vehicle.status === 'stopped' ? 'Last driven by' : 'Assigned driver'}</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              {vehicle.driverDetailsGenerated && <p className="driver-generated-note">Generated driver details</p>}
              <div className="driver-details-grid">
                <div><span>Full name</span><b>{vehicle.driver || 'Not available'}</b></div>
                <div><span>Driver ID</span><b>{vehicle.driverId || 'Not available'}</b></div>
                <div className="driver-details-full"><span>Address</span><b>{vehicle.driverAddress || 'Not available'}</b></div>
                <div><span>Phone number</span><b>{vehicle.driverPhone || 'Not available'}</b></div>
                <div><span>Email address</span><b>{vehicle.driverEmail || 'Not available'}</b></div>
              </div>
              <div className="driver-details-scores" aria-label="Driver scores"><div><span>Driving score</span><b>{vehicle.driverScore ?? (75 + (Number(vehicle.id.slice(3)) % 25))}<small> / 100</small></b></div><div><span>Fuel score</span><b>{vehicle.fuelScore ?? (70 + (Number(vehicle.id.slice(3)) * 7 % 30))}<small> / 100</small></b></div></div>
            </details>
            <details className="details-accordion">
              <summary className="accordion-heading"><span className="driver-details-icon"><Clock size={16} aria-hidden="true" /></span><span className="accordion-title"><b>ELD & duty logs</b><small>Driver duty records and hours</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              <DriverELD vehicle={vehicle} />
            </details>
            <details className="details-accordion" onToggle={event => setMediaOpen(event.currentTarget.open)}>
              <summary className="accordion-heading"><span className="driver-details-icon"><Video size={16} aria-hidden="true" /></span><span className="accordion-title"><b>Media</b><small>Dashcam video and snapshots</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              {mediaOpen && <LiveDashcam credits={demoCredits} setCredits={setDemoCredits} />}
            </details>
            <details className="details-accordion">
              <summary className="accordion-heading"><span className="driver-details-icon"><Wrench size={16} aria-hidden="true" /></span><span className="accordion-title"><b>Maintenance & inspections</b><small>Service documents and DVIRs</small></span><ChevronDown size={16} className="accordion-chevron" /></summary>
              <VehicleRecords vehicle={vehicle} hideHeading />
            </details>
          </>
        ) : tab === 'nearby' ? (
          <section className="nearby-section" aria-label={nearbySelection ? 'Directions to nearby vehicle' : 'Nearby vehicles'}>
            {nearbySelection ? <>
              <button type="button" className="nearby-back" onClick={() => { setNearbySelection(null); onNearbyRoute(null); onNearbyDestination(null); onNearbyHover(null); requestAnimationFrame(() => { if (detailsContentRef.current) detailsContentRef.current.scrollTop = nearbyScrollRef.current; }); }}><ChevronLeft size={16} />Nearby vehicles</button>
              <div className="nearby-directions"><div className="nearby-directions-heading"><div><b>Directions</b><span>{vehicle.id} → {nearbySelection.target.id}</span></div></div><div className="nearby-route-summary">{nearbySelection.route ? `${(nearbySelection.route.metres / 1000).toFixed(1)} km along available road geometry` : 'Road route unavailable'}</div>{nearbySelection.route ? <><p>Directions follow the available road geometry. Road restrictions are not available.</p><ol>{nearbySelection.route.steps.map((step, index) => <li key={index}><span>{index + 1}</span><div><b>{step.text}</b><small>{step.metres < 1000 ? `${Math.round(step.metres)} m` : `${(step.metres / 1000).toFixed(1)} km`} from start</small></div></li>)}</ol></> : <p>A suitable route is not available in the current road data.</p>}</div>
            </> : <>
              <div className="nearby-header"><div><h3>Nearby vehicles</h3><p>Distance from {vehicle.id}</p></div><label>Radius<select aria-label="Nearby vehicle radius" value={nearbyRadius} onChange={event => setNearbyRadius(Number(event.target.value))}>{[1, 2, 5, 10, 25, 50].map(radius => <option key={radius} value={radius}>{radius} km</option>)}</select></label></div>
              <p className="nearby-count" aria-live="polite">{nearbyVehicles.length} {nearbyVehicles.length === 1 ? 'vehicle' : 'vehicles'} within {nearbyRadius} km · Straight-line distance</p>
              {nearbyVehicles.length ? <div className="fleet-list compact nearby-list">{nearbyVehicles.map(item => <div className="nearby-entry" key={item.vehicle.id} onMouseEnter={() => onNearbyHover(item.vehicle)} onMouseLeave={() => onNearbyHover(null)} onFocus={() => onNearbyHover(item.vehicle)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onNearbyHover(null); }}>{renderNearbyVehicle(item.vehicle, `${item.distance < 1 ? `${Math.round(item.distance * 1000)} m` : `${item.distance.toFixed(1)} km`} away${item.vehicle.sampleContext?.kind === 'offline' ? ' · Last known' : ''}`, () => chooseNearby(item.vehicle))}</div>)}</div> : <div className="nearby-empty">No vehicles within {nearbyRadius} km. Try a larger radius.</div>}
            </>}
          </section>
        ) : (
          <>
            <div className="history-trip-selector"><div className="trip-dropdown" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setTripMenuOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setTripMenuOpen(false); event.currentTarget.querySelector('.trip-dropdown-trigger')?.focus(); } }}><button type="button" className="trip-dropdown-trigger" aria-label="Select trips" aria-expanded={tripMenuOpen} aria-controls="history-trip-options" onClick={() => setTripMenuOpen(open => !open)}><span>{selectedTrip === 'all' ? 'All trips' : selectedTripRecord ? `${formatDayLabel(selectedTripRecord.day)} · ${selectedTripRecord.timeRange}` : 'All trips'}</span><ChevronDown size={15} /></button>{tripMenuOpen && <div id="history-trip-options" className="trip-dropdown-options" role="group" aria-label="Choose trips">{[['all', 'All trips'], ...availableTrips.map(trip => [trip.id, `${formatDayLabel(trip.day)} · ${trip.timeRange}`])].map(([value, label]) => <button type="button" key={value} aria-pressed={selectedTrip === value} onClick={() => selectHistoryTrip(value)}><span>{label}</span>{selectedTrip === value && <Check size={15} aria-hidden="true" />}</button>)}</div>}</div><div className="trip-navigation" aria-label="Navigate trips"><button type="button" aria-label="Previous trip" title="Previous trip" disabled={!availableTrips.length || (selectedTrip !== 'all' && selectedTripIndex >= availableTrips.length - 1)} onClick={() => selectHistoryTrip(availableTrips[selectedTrip === 'all' ? 0 : selectedTripIndex + 1].id)}><ChevronLeft size={16} /></button><button type="button" aria-label="Next trip" title="Next trip" disabled={!availableTrips.length || (selectedTrip !== 'all' && selectedTripIndex <= 0)} onClick={() => selectHistoryTrip(availableTrips[selectedTrip === 'all' ? availableTrips.length - 1 : selectedTripIndex - 1].id)}><ChevronRight size={16} /></button></div></div>
            <details className="history-trip-summary"><summary><span>Trip summary</span><ChevronDown size={16} aria-hidden="true" /></summary>{visibleTrips.length ? <div className="history-summary-grid"><div><span>Trips</span><b>{visibleTrips.length}</b></div><div><span>Distance</span><b>{totalTripDistance.toFixed(1)} km</b></div><div><span>Alerts</span><b>{alertCount}</b></div></div> : <p>No trips in this date and time range.</p>}{!isAllDay && visibleTrips.length > 0 && <p>Distance covers the full selected trips.</p>}</details>
            <div className="history-timeline-controls"><div className="history-timeline-heading"><h3>Timeline</h3><div className={`timeline-search ${timelineSearchOpen ? 'is-open' : ''}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !timelineSearch.trim()) setTimelineSearchOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { if (timelineSearch) setTimelineSearch(''); else { setTimelineSearchOpen(false); event.currentTarget.querySelector('button')?.focus(); } } }}><button type="button" className="timeline-search-toggle" aria-label="Search timeline" aria-expanded={timelineSearchOpen} onClick={() => { if (!timelineSearchOpen) setTimelineSearchOpen(true); else if (!timelineSearch.trim()) setTimelineSearchOpen(false); else timelineSearchRef.current?.focus(); }}><Search size={15} aria-hidden="true" /></button><input ref={timelineSearchRef} type="search" aria-label="Search timeline" placeholder="Search timeline" value={timelineSearch} disabled={!timelineSearchOpen} onChange={event => setTimelineSearch(event.target.value)} /></div></div>
            <div className="history-filters" role="group" aria-label="Filter timeline events">{[['all', 'All'], ['trip', 'Trip'], ['stops', 'Stops'], ['alerts', 'Alerts']].map(([key, label]) => <button type="button" key={key} aria-pressed={timelineFilter === key} onClick={() => setTimelineFilter(key)}>{label}</button>)}</div></div>
            {visibleTrips.map(trip => {
              const filteredEvents = trip.events.filter(e => {
                const inTimeWindow = isAllDay || (e.time >= startTime && e.time <= endTime);
                const matchesSearch = !timelineSearch.trim() || [e.label, e.detail, e.time].some(value => value.toLowerCase().includes(timelineSearch.trim().toLowerCase()));
                return inTimeWindow && matchesSearch && (timelineFilter === 'all' || timelineFilter === tripEventCategory(e));
              });

              return (
                <div key={trip.id} className="history-day-group">
                  <div className="history-day-header">
                    <span>{formatDayLabel(trip.day)} · {trip.timeRange}</span>
                    <span className="history-day-sub">
                      {isAllDay ? 'All Day · IST' : `${startTime}–${endTime} IST`}
                    </span>
                  </div>

                  {filteredEvents.length > 0 ? (
                    <div className="history-events">
                      {filteredEvents.map(event => (
                        <button
                          key={`${trip.id}-${event.at}`}
                          onClick={() => { setSelectedTrip(trip.id); setPlayback(true); setPlaying(false); setProgress(event.at); }}
                        >
                          <b>{event.time} IST · {event.label}</b>
                          <span>{event.detail} · Select to view on map</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="history-empty-window">
                      <span>{timelineFilter !== 'all' || timelineSearch.trim() ? 'No matching activity for this search and filter.' : `No events found between ${startTime} and ${endTime} IST`}</span>
                      {timelineFilter !== 'all' || timelineSearch.trim() ? <button type="button" className="reset-time-link" onClick={() => { setTimelineFilter('all'); setTimelineSearch(''); }}>Show all activity</button> : !isAllDay && <button type="button" className="reset-time-link" onClick={() => setTimePreset('00:00', '23:59')}>Reset to All Day</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sticky Bottom Trip Playback Bar with Optional Telemetry Overlays */}
      {playback && (
        <div className="playback-sticky-footer" role="region" aria-label="Trip playback controls">
          <div className="playback-header-row">
            <div className="playback-title-meta">
              <h3>Trip playback</h3>
              <p className="playback-subtitle">Road-based route</p>
            </div>
            <div className="playback-header-actions">
              <button
                type="button"
                className={`playback-toggle-btn ${showGraphs ? 'active' : ''}`}
                onClick={() => setShowGraphs(v => !v)}
                title={showGraphs ? 'Disable telemetry graph' : 'Show telemetry graph'}
              >
                <Activity size={13} />
                <span>{showGraphs ? 'Disable graph' : 'Show graph'}</span>
              </button>
              <button
                type="button"
                className="playback-exit-btn"
                onClick={() => { setPlayback(false); setPlaying(false); }}
              >
                Exit replay
              </button>
            </div>
          </div>

          {showGraphs ? (
            <>
              {/* Metric Selector Tabs with Real-Time Values */}
              <div className="telemetry-metric-switcher" role="tablist" aria-label="Telemetry streams">
                <button
                  type="button"
                  role="tab"
                  aria-selected={telemetryMetric === 'speed'}
                  className={`metric-tab metric-speed ${telemetryMetric === 'speed' ? 'active' : ''}`}
                  onClick={() => setTelemetryMetric('speed')}
                >
                  <span className="metric-indicator speed-dot" />
                  <span className="metric-tab-name">Speed</span>
                  <b className={`metric-tab-val ${currentTelemetry.speed > 50 ? 'alert' : ''}`}>
                    {currentTelemetry.speed} <small>km/h</small>
                  </b>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={telemetryMetric === 'gforce'}
                  className={`metric-tab metric-gforce ${telemetryMetric === 'gforce' ? 'active' : ''}`}
                  onClick={() => setTelemetryMetric('gforce')}
                >
                  <span className="metric-indicator gforce-dot" />
                  <span className="metric-tab-name">G-Force</span>
                  <b className={`metric-tab-val ${currentTelemetry.gForce >= 0.35 ? 'alert' : ''}`}>
                    {currentTelemetry.gForce.toFixed(2)} <small>g</small>
                  </b>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={telemetryMetric === 'accel'}
                  className={`metric-tab metric-accel ${telemetryMetric === 'accel' ? 'active' : ''}`}
                  onClick={() => setTelemetryMetric('accel')}
                >
                  <span className="metric-indicator accel-dot" />
                  <span className="metric-tab-name">Accel</span>
                  <b className={`metric-tab-val ${currentTelemetry.accel <= -2.5 ? 'alert' : ''}`}>
                    {currentTelemetry.accel > 0 ? `+${currentTelemetry.accel.toFixed(1)}` : currentTelemetry.accel.toFixed(1)} <small>m/s²</small>
                  </b>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={telemetryMetric === 'all'}
                  className={`metric-tab metric-all ${telemetryMetric === 'all' ? 'active' : ''}`}
                  onClick={() => setTelemetryMetric('all')}
                  title="Overlay Speed, G-Force and Acceleration"
                >
                  <Layers size={13} />
                  <span className="metric-tab-name">All 3</span>
                </button>
              </div>

              {/* Interactive Telemetry Graph Overlay (The Timeline Track) */}
              <div className="telemetry-graph-card">
                {/* Y-Axis Scale Guides */}
                <div className="telemetry-y-axis" aria-hidden="true">
                  {telemetryMetric === 'speed' && (
                    <>
                      <span className="y-label top">65</span>
                      <span className="y-label alert" style={{ top: '29%' }}>50</span>
                      <span className="y-label btm">0</span>
                    </>
                  )}
                  {telemetryMetric === 'gforce' && (
                    <>
                      <span className="y-label top">0.5g</span>
                      <span className="y-label alert" style={{ top: '35%' }}>.35</span>
                      <span className="y-label btm">0g</span>
                    </>
                  )}
                  {telemetryMetric === 'accel' && (
                    <>
                      <span className="y-label top">+3</span>
                      <span className="y-label zero" style={{ top: '45%' }}>0</span>
                      <span className="y-label alert" style={{ top: '73%' }}>-2.5</span>
                      <span className="y-label btm">-4</span>
                    </>
                  )}
                  {telemetryMetric === 'all' && (
                    <>
                      <span className="y-label top">Max</span>
                      <span className="y-label zero" style={{ top: '45%' }}>Mid</span>
                      <span className="y-label btm">Min</span>
                    </>
                  )}
                </div>

                {/* Inner track area handling pointer scrubbing */}
                <div
                  className="telemetry-track-area"
                  ref={graphRef}
                  onPointerDown={handleGraphPointerDown}
                  onPointerMove={handleGraphPointerMove}
                  onPointerUp={handleGraphPointerUp}
                  onPointerLeave={handleGraphPointerLeave}
                  role="presentation"
                >
                  {/* Threshold Reference Lines */}
                  {telemetryMetric === 'speed' && (
                    <div className="telemetry-threshold-line speed-limit-line" style={{ top: '29%' }}>
                      <span>50 km/h limit</span>
                    </div>
                  )}
                  {telemetryMetric === 'gforce' && (
                    <div className="telemetry-threshold-line gforce-limit-line" style={{ top: '35%' }}>
                      <span>0.35 g turn limit</span>
                    </div>
                  )}
                  {telemetryMetric === 'accel' && (
                    <>
                      <div className="telemetry-threshold-line accel-zero-line" style={{ top: '45%' }}>
                        <span>0 m/s²</span>
                      </div>
                      <div className="telemetry-threshold-line accel-brake-line" style={{ top: '73%' }}>
                        <span>-2.5 m/s² brake limit</span>
                      </div>
                    </>
                  )}

                  {/* SVG Telemetry Curves */}
                  <svg
                    className="telemetry-svg-canvas"
                    viewBox="0 0 1000 140"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="vayu-speed-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f36c2d" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#f36c2d" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="vayu-gforce-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="vayu-accel-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="45%" stopColor="#10b981" stopOpacity="0.03" />
                        <stop offset="46%" stopColor="#ef4444" stopOpacity="0.03" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="0" y1="20" x2="1000" y2="20" stroke="#f0eee9" strokeDasharray="3 3" />
                    <line x1="0" y1="63" x2="1000" y2="63" stroke="#e8e5df" strokeDasharray="3 3" />
                    <line x1="0" y1="126" x2="1000" y2="126" stroke="#dedbd5" />

                    {/* Area Fills */}
                    {(telemetryMetric === 'speed' || telemetryMetric === 'all') && (
                      <path d={speedAreaPath} fill="url(#vayu-speed-grad)" opacity={telemetryMetric === 'all' ? 0.4 : 1} />
                    )}
                    {(telemetryMetric === 'gforce' || telemetryMetric === 'all') && (
                      <path d={gForceAreaPath} fill="url(#vayu-gforce-grad)" opacity={telemetryMetric === 'all' ? 0.35 : 1} />
                    )}
                    {(telemetryMetric === 'accel' || telemetryMetric === 'all') && (
                      <path d={accelAreaPath} fill="url(#vayu-accel-grad)" opacity={telemetryMetric === 'all' ? 0.35 : 1} />
                    )}

                    {/* Line Strokes */}
                    {(telemetryMetric === 'speed' || telemetryMetric === 'all') && (
                      <path
                        d={speedLinePath}
                        fill="none"
                        stroke="#f36c2d"
                        strokeWidth={telemetryMetric === 'speed' ? '2.4' : '1.8'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {(telemetryMetric === 'gforce' || telemetryMetric === 'all') && (
                      <path
                        d={gForceLinePath}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth={telemetryMetric === 'gforce' ? '2.4' : '1.8'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {(telemetryMetric === 'accel' || telemetryMetric === 'all') && (
                      <path
                        d={accelLinePath}
                        fill="none"
                        stroke={telemetryMetric === 'accel' ? '#059669' : '#0284c7'}
                        strokeWidth={telemetryMetric === 'accel' ? '2.4' : '1.8'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                  </svg>

                  {/* Fixed-size points remain circular as the graph resizes. */}
                  {telemetryData.incidents.map(inc => {
                    const y = telemetryMetric === 'gforce' ? gForceToY(inc.gForce) : telemetryMetric === 'accel' ? accelToY(inc.accel) : speedToY(inc.speed);
                    const isCurrent = Math.abs(progress - inc.progress) <= 2;
                    return <span key={inc.progress} aria-hidden="true" className={`telemetry-event-point ${inc.event.severity === 'alert' ? 'is-alert' : ''} ${isCurrent ? 'is-current' : ''}`} style={{ left: `${inc.progress}%`, top: `${y / 140 * 100}%` }} />;
                  })}

                  {/* Hover Guide Needle */}
                  {hoverProgress !== null && hoverProgress !== progress && (
                    <div className="telemetry-hover-line" style={{ left: `${hoverProgress}%` }} />
                  )}

                  {/* Synchronized Playhead Needle */}
                  <div className="telemetry-playhead-needle" style={{ left: `${progress}%` }}>
                    <div className="telemetry-needle-glow" />
                    <div
                      className="telemetry-needle-thumb"
                      style={{
                        top: `${thumbYPct}%`,
                        borderColor:
                          telemetryMetric === 'speed'
                            ? '#f36c2d'
                            : telemetryMetric === 'gforce'
                            ? '#8b5cf6'
                            : telemetryMetric === 'accel'
                            ? '#059669'
                            : '#f36c2d'
                      }}
                    />
                  </div>

                  {/* Synchronized Real-Time HUD Badge (Single-line pill on hover / scrub) */}
                  {(hoverProgress !== null || isDragging) && (
                    <div
                      className={`telemetry-floating-hud ${displayTelemetry.event ? 'has-incident' : ''}`}
                      style={{
                        left: `${hoverProgress !== null ? hoverProgress : progress}%`,
                        transform: `translateX(${
                          (hoverProgress !== null ? hoverProgress : progress) <= 24
                            ? '0%'
                            : (hoverProgress !== null ? hoverProgress : progress) >= 68
                            ? '-100%'
                            : '-50%'
                        })`
                      }}
                    >
                      <span className="hud-time">{displayTelemetry.timeStr}</span>
                      {displayTelemetry.event && (
                        <span className={`hud-badge ${displayTelemetry.event.severity}`}>
                          {displayTelemetry.event.label}
                        </span>
                      )}
                      <span className="hud-metric-values">
                        <span className={`hud-val ${telemetryMetric === 'speed' ? 'focused' : ''}`}>
                          {displayTelemetry.speed} km/h
                        </span>
                        <span className="hud-sep">·</span>
                        <span className={`hud-val ${telemetryMetric === 'gforce' ? 'focused' : ''}`}>
                          {displayTelemetry.gForce.toFixed(2)} g
                        </span>
                        <span className="hud-sep">·</span>
                        <span className={`hud-val ${telemetryMetric === 'accel' ? 'focused' : ''}`}>
                          {displayTelemetry.accel > 0 ? `+${displayTelemetry.accel.toFixed(1)}` : displayTelemetry.accel.toFixed(1)} m/s²
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Accessible screen-reader & keyboard input overlay */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    className="telemetry-accessible-range"
                    aria-label="Trip playback timeline scrubber"
                    aria-valuetext={`${time} IST, ${displayTelemetry.speed} km/h, ${displayTelemetry.gForce} g, ${displayTelemetry.accel} m/s²`}
                    onChange={e => {
                      setPlaying(false);
                      setProgress(Number(e.target.value));
                    }}
                  />
                </div>
              </div>

              {/* Quick-Jump Event Strip */}
              <div className="telemetry-incidents-strip" aria-label="Trip events">
                <span className="incidents-strip-title">Events:</span>
                <div className="incidents-strip-scroll-wrap">
                  {canScrollLeft && (
                    <button
                      type="button"
                      className="pills-scroll-btn prev"
                      onClick={() => handleScrollPills(-160)}
                      aria-label="Scroll events left"
                      title="Scroll left"
                    >
                      <ChevronLeft size={13} />
                    </button>
                  )}

                  <div
                    className="incidents-pills-row"
                    ref={pillsRowRef}
                    onWheel={handlePillsWheel}
                    onScroll={updateScrollButtons}
                    onMouseDown={handlePillMouseDown}
                    onMouseMove={handlePillMouseMove}
                    onMouseUp={handlePillMouseUp}
                    onMouseLeave={handlePillMouseUp}
                  >
                    {telemetryData.incidents.map(inc => {
                      const isCurrent = Math.abs(progress - inc.progress) <= 2;
                      return (
                        <button
                          key={inc.progress}
                          type="button"
                          className={`incident-pill ${inc.event.severity} ${isCurrent ? 'active' : ''}`}
                          onClick={() => {
                            if (panMovedRef.current) return;
                            setPlaying(false);
                            setProgress(inc.progress);
                          }}
                          title={`Jump to ${inc.timeStr.slice(0, 5)} IST · ${inc.event.label}`}
                        >
                          <span className={`incident-indicator-dot ${inc.event.severity}`} />
                          <span className="incident-time">{inc.timeStr.slice(0, 5)}</span>
                          <span className="incident-text">{inc.event.label}</span>
                          {inc.event.badge && <span className="incident-badge">{inc.event.badge}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {canScrollRight && (
                    <button
                      type="button"
                      className="pills-scroll-btn next"
                      onClick={() => handleScrollPills(160)}
                      aria-label="Scroll events right"
                      title="Scroll right"
                    >
                      <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Transport Controls & Time Readout */}
              <div className="playback-footer-controls">
                <div className="playback-transport-left">
                  <button
                    type="button"
                    className="co-button playback-play-btn"
                    onClick={() => {
                      if (progress === 100) setProgress(0);
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                    <span>{playing ? 'Pause' : 'Play'}</span>
                  </button>

                  <label className="playback-speed-label">
                    Speed{' '}
                    <select
                      aria-label="Playback speed"
                      value={speed}
                      onChange={e => setSpeed(Number(e.target.value))}
                    >
                      <option value="1">1×</option>
                      <option value="2">2×</option>
                      <option value="4">4×</option>
                    </select>
                  </label>
                </div>

                <div className="playback-time-cluster">
                  <span className="playback-clock">{time} IST</span>
                  <span className="playback-progress-tag">{progress}%</span>
                </div>
              </div>
            </>
          ) : (
            /* Clean Standard Timeline Layout when graphs are disabled */
            <div className="standard-playback-layout">
              <div className="playback-controls-row">
                <button
                  type="button"
                  className="co-button playback-play-btn"
                  onClick={() => {
                    if (progress === 100) setProgress(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                  <span>{playing ? 'Pause' : 'Play'}</span>
                </button>

                <label className="playback-speed-label">
                  Speed{' '}
                  <select
                    aria-label="Playback speed"
                    value={speed}
                    onChange={e => setSpeed(Number(e.target.value))}
                  >
                    <option value="1">1×</option>
                    <option value="2">2×</option>
                    <option value="4">4×</option>
                  </select>
                </label>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                className="standard-playback-range"
                aria-label="Trip playback position"
                aria-valuetext={`${time} IST`}
                onChange={e => {
                  setPlaying(false);
                  setProgress(Number(e.target.value));
                }}
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${progress}%, #3f3d3a ${progress}%, #3f3d3a 100%)`
                }}
              />

              <div className="playback-time">
                <span>{time} IST</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
