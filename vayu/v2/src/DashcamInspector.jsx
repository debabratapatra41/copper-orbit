import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Flame,
  Fuel,
  Gauge,
  Maximize2,
  Minimize2,
  MapPin,
  MoveRight,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  Video,
  X,
  Zap
} from 'lucide-react';

export function getDashcamUrl(filename) {
  const base = import.meta.env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}dashcam/${filename}`;
}

export function getRouteMetrics(points) {
  if (!points || points.length < 2) return { totalDist: 0, segDists: [], cumDists: [0] };
  const segDists = [];
  const cumDists = [0];
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    segDists.push(d);
    totalDist += d;
    cumDists.push(totalDist);
  }
  return { totalDist, segDists, cumDists };
}

export function getCoordinateAtProgress(points, pct) {
  if (!points || !points.length) return null;
  if (points.length === 1) return points[0];
  const { totalDist, cumDists } = getRouteMetrics(points);
  if (totalDist === 0) return points[0];
  const targetDist = (Math.max(0, Math.min(100, pct)) / 100) * totalDist;

  for (let i = 0; i < points.length - 1; i++) {
    if (targetDist <= cumDists[i + 1] || i === points.length - 2) {
      const segLen = cumDists[i + 1] - cumDists[i];
      const t = segLen > 0 ? (targetDist - cumDists[i]) / segLen : 0;
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * t,
        points[i][1] + (points[i + 1][1] - points[i][1]) * t
      ];
    }
  }
  return points[points.length - 1];
}

export function projectLatLngToRoute(points, latlng) {
  if (!points || points.length < 2) return { pct: 0, latlng: points[0] || [0, 0] };
  const { totalDist, cumDists, segDists } = getRouteMetrics(points);
  let bestDistSq = Infinity;
  let bestProj = points[0];
  let bestCumulativeDist = 0;

  const py = latlng.lat !== undefined ? latlng.lat : latlng[0];
  const px = latlng.lng !== undefined ? latlng.lng : latlng[1];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dy = b[0] - a[0];
    const dx = b[1] - a[1];
    const lenSq = dy * dy + dx * dx;

    let t = 0;
    if (lenSq > 0) {
      t = ((py - a[0]) * dy + (px - a[1]) * dx) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projY = a[0] + t * dy;
    const projX = a[1] + t * dx;
    const distSq = (py - projY) * (py - projY) + (px - projX) * (px - projX);

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestProj = [projY, projX];
      bestCumulativeDist = cumDists[i] + t * segDists[i];
    }
  }

  const pct = totalDist > 0 ? Math.round((bestCumulativeDist / totalDist) * 100) : 0;
  return { pct: Math.max(0, Math.min(100, pct)), latlng: bestProj };
}

export function getTripTelemetry(vehicleId) {
  const points = [];

  for (let p = 0; p <= 100; p++) {
    const s = 9 * 3600 + 52 * 60 + 30 + Math.round(p * 30);
    const timeStr = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
      .map(n => String(n).padStart(2, '0'))
      .join(':');

    let speed = 0;
    let gForce = 0.05;
    let accel = 0.0;
    let latG = 0.02;
    let longG = 0.01;
    let event = null;

    if (p === 0) {
      speed = 0;
      accel = 0.0;
      gForce = 0.02;
      latG = 0.01;
      longG = 0.01;
      event = { type: 'start', label: 'Trip started', badge: 'Ignition on', severity: 'info' };
    } else if (p <= 6) {
      speed = Math.round((p / 6) * 36);
      accel = Number((1.8 - (p / 6) * 0.6).toFixed(1));
      gForce = Number((0.05 + (p / 6) * 0.07).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
      latG = 0.02;
    } else if (p <= 16) {
      if (p === 12) {
        speed = 46;
        accel = 2.8;
        gForce = 0.32;
        longG = 0.29;
        latG = 0.08;
        event = { type: 'accel', label: 'Harsh acceleration', badge: '+2.8 m/s²', severity: 'warning' };
      } else {
        const t = (p - 6) / 10;
        speed = Math.round(36 + t * 10);
        accel = Number((0.8 + Math.sin(p * 1.5) * 0.4).toFixed(1));
        gForce = Number((0.12 + Math.cos(p * 0.8) * 0.05).toFixed(2));
        longG = Number((accel / 9.81).toFixed(2));
        latG = Number((Math.sin(p * 0.7) * 0.05).toFixed(2));
      }
    } else if (p <= 26) {
      speed = Math.round(44 + Math.sin(p * 0.6) * 5);
      accel = Number((Math.sin(p * 1.2) * 0.4).toFixed(1));
      gForce = Number((0.14 + Math.sin(p * 0.9) * 0.06).toFixed(2));
      latG = Number((Math.cos(p * 0.5) * 0.07).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
    } else if (p <= 34) {
      const t = (p - 26) / 8;
      speed = Math.max(0, Math.round(44 * (1 - t)));
      accel = Number((-1.4 - t * 0.6).toFixed(1));
      gForce = Number((0.14 * (1 - t)).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
      latG = 0.02;
    } else if (p <= 42) {
      speed = 0;
      accel = 0.0;
      gForce = 0.01;
      longG = 0.0;
      latG = 0.0;
      if (p === 38) {
        event = { type: 'stop', label: 'Stop', badge: '4 min', severity: 'info' };
      }
    } else if (p <= 54) {
      const t = (p - 42) / 12;
      if (p === 52) {
        speed = 58;
        accel = 0.6;
        gForce = 0.22;
        longG = 0.06;
        latG = 0.18;
        event = { type: 'speed', label: 'Speed limit exceeded', badge: '58 km/h', severity: 'alert' };
      } else {
        speed = Math.round(t * 54);
        accel = Number((1.6 - t * 0.9).toFixed(1));
        gForce = Number((0.08 + t * 0.08).toFixed(2));
        longG = Number((accel / 9.81).toFixed(2));
        latG = 0.04;
      }
    } else if (p <= 66) {
      if (p === 65) {
        speed = 24;
        accel = -0.4;
        gForce = 0.42;
        latG = 0.39;
        longG = -0.04;
        event = { type: 'gforce', label: 'Harsh turn', badge: '0.42 g', severity: 'alert' };
      } else {
        const t = (p - 54) / 12;
        speed = Math.round(54 - t * 30);
        accel = Number((-1.8 + t * 0.8).toFixed(1));
        gForce = Number((0.16 + t * 0.22).toFixed(2));
        latG = Number((t * 0.25).toFixed(2));
        longG = Number((accel / 9.81).toFixed(2));
      }
    } else if (p <= 77) {
      const t = (p - 66) / 11;
      speed = Math.round(24 + t * 24);
      accel = Number((1.2 - t * 0.7).toFixed(1));
      gForce = Number((0.16 - t * 0.06).toFixed(2));
      latG = Number((0.06 - t * 0.04).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
    } else if (p <= 82) {
      if (p === 78) {
        speed = 28;
        accel = -3.6;
        gForce = 0.38;
        longG = -0.37;
        latG = 0.08;
        event = { type: 'accel', label: 'Harsh braking', badge: '-3.6 m/s²', severity: 'alert' };
      } else if (p === 79) {
        speed = 18;
        accel = -2.2;
        gForce = 0.24;
        longG = -0.22;
        latG = 0.05;
      } else {
        const t = (p - 77) / 5;
        speed = Math.round(28 - t * 8);
        accel = Number((-1.2 + t * 0.8).toFixed(1));
        gForce = Number((0.18 - t * 0.08).toFixed(2));
        longG = Number((accel / 9.81).toFixed(2));
        latG = 0.03;
      }
    } else if (p <= 94) {
      speed = Math.round(34 + Math.sin(p * 0.8) * 4);
      accel = Number((Math.sin(p) * 0.3).toFixed(1));
      gForce = Number((0.10 + Math.cos(p * 0.7) * 0.04).toFixed(2));
      latG = Number((Math.sin(p * 0.6) * 0.05).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
    } else {
      const t = (p - 94) / 6;
      speed = Math.max(0, Math.round(34 * (1 - t)));
      accel = Number((-1.5).toFixed(1));
      gForce = Number((0.06 * (1 - t)).toFixed(2));
      longG = Number((accel / 9.81).toFixed(2));
      latG = 0.01;
      if (p === 100) {
        event = { type: 'end', label: 'Trip ended', badge: 'Destination reached', severity: 'info' };
      }
    }

    // Determine dashcam snapshot for this progress point
    let frontImgName = 'dashcam_highway_cruise.jpg';
    if (p <= 14) {
      frontImgName = 'dashcam_depot_start.jpg';
    } else if (p >= 15 && p <= 44) {
      frontImgName = p >= 35 && p <= 42 ? 'dashcam_city_traffic.jpg' : 'dashcam_highway_cruise.jpg';
    } else if (p >= 45 && p <= 64) {
      frontImgName = 'dashcam_highway_cruise.jpg';
    } else if (p >= 65 && p <= 94) {
      frontImgName = 'dashcam_city_traffic.jpg';
    } else {
      frontImgName = 'dashcam_depot_start.jpg';
    }

    const frontImg = getDashcamUrl(frontImgName);
    const cabinImg = getDashcamUrl('dashcam_cabin_driver.jpg');

    const speedLimit = p <= 5 || p >= 96 ? 20 : p >= 44 && p <= 60 ? 50 : 50;
    const isSpeeding = speed > speedLimit;

    // Movement details
    let locationName = 'Austin Town Corridor, Bengaluru';
    if (p <= 12) locationName = 'Central Logistics Hub · Gate 3, Richmond Rd';
    else if (p <= 28) locationName = 'Richmond Circle Flyover Approach';
    else if (p <= 44) locationName = 'Austin Town Commercial Junction';
    else if (p <= 62) locationName = 'Halasuru Lake Outer Link Boulevard';
    else if (p <= 74) locationName = 'Indiranagar Delivery Geofence Entry';
    else if (p <= 92) locationName = '100 Feet Rd · Metro Pillar 142, Indiranagar';
    else locationName = 'Whitefield Logistics Hub · Inbound Bay 4';

    let motionState = `Cruising smoothly at ${speed} km/h`;
    let motionType = 'normal';
    if (event?.type === 'accel') {
      motionState = 'Harsh Acceleration (+2.8 m/s²)';
      motionType = 'warning';
    } else if (event?.type === 'speed') {
      motionState = `Speed Alert: ${speed} km/h (Limit ${speedLimit})`;
      motionType = 'alert';
    } else if (event?.type === 'gforce') {
      motionState = 'Harsh Turn (0.42g Lateral Force)';
      motionType = 'alert';
    } else if (p === 78) {
      motionState = 'Harsh Braking (-3.6 m/s²)';
      motionType = 'alert';
    } else if (p === 38 || (speed === 0 && p > 0 && p < 100)) {
      motionState = 'Stationary · Signal Hold (Dwell 4 min)';
      motionType = 'idle';
    } else if (p === 0) {
      motionState = 'Depot Checkout · Pre-trip Cleared';
      motionType = 'info';
    } else if (p === 100) {
      motionState = 'Destination Hub Reached · Parked';
      motionType = 'info';
    } else if (accel > 1.2) {
      motionState = `Accelerating briskly (+${accel} m/s²)`;
      motionType = 'normal';
    } else if (accel < -1.2) {
      motionState = `Decelerating smoothly (${accel} m/s²)`;
      motionType = 'normal';
    }

    const throttleVal = Math.max(0, Math.min(100, Math.round(accel > 0 ? 25 + accel * 14 : speed > 0 ? 22 : 0)));
    const brakeVal = Math.max(0, Math.min(100, Math.round(accel < 0 ? Math.abs(accel) * 26 : speed === 0 ? 80 : 0)));
    const steeringVal = p === 65 ? '+18.5° (Right Turn)' : p >= 55 && p <= 62 ? '-8.2° (Left Curve)' : '+1.2° (Straight)';
    const gearVal = speed === 0 ? (p === 100 ? 'P' : 'N') : speed > 40 ? 'D4' : 'D3';
    const rpmVal = speed === 0 ? (p === 100 ? 0 : 750) : Math.round(1100 + speed * 22);
    const fuelVal = `${78 - Math.round(p * 0.08)}%`;
    const distanceKm = `${(p * 0.184).toFixed(1)} km`;

    // AI vision detections
    let aiTarget = 'Lead vehicle 24.6m ahead · Safe gap (2.2s)';
    let aiBox = { top: 38, left: 42, width: 22, height: 26, label: 'Vehicle · 24m' };
    if (p <= 14) {
      aiTarget = 'Exit boom barrier · Clearance 3.2m';
      aiBox = { top: 40, left: 36, width: 28, height: 22, label: 'Gate Barrier' };
    } else if (p >= 35 && p <= 42) {
      aiTarget = 'Crosswalk & yellow auto-rickshaw 6.4m';
      aiBox = { top: 44, left: 38, width: 26, height: 32, label: 'Auto-Rickshaw · 6.4m' };
    } else if (p === 78) {
      aiTarget = 'Sudden brake event · Lead distance 12.1m (-1.4s)';
      aiBox = { top: 36, left: 40, width: 24, height: 30, label: 'Close Target · 12m' };
    }

    const movement = {
      speed,
      speedLimit,
      isSpeeding,
      gForce,
      accel,
      latG,
      longG,
      throttle: `${throttleVal}%`,
      brake: `${brakeVal}%`,
      steering: steeringVal,
      gear: gearVal,
      rpm: rpmVal,
      fuel: fuelVal,
      distance: distanceKm,
      locationName,
      motionState,
      motionType,
      aiDetection: {
        target: aiTarget,
        box: aiBox,
        gap: speed === 0 ? '0.0s (Stationary)' : '1.9s (Safe margin)',
        lane: 'Centered in Lane 2 · Drift 0.03m',
        driverScore: '98/100 · Focused & Alert',
        seatbelt: 'Fastened',
        pedestrian: p >= 36 && p <= 42 ? 'Pedestrians waiting on curb' : 'Path clear'
      }
    };

    const dashcam = {
      frontImg,
      cabinImg,
      frontName: frontImgName,
      resolution: '1920 × 1080 · 60 FPS',
      bitrate: '14.2 Mbps · H.265'
    };

    points.push({ progress: p, timeStr, speed, gForce, accel, event, movement, dashcam });
  }

  const incidents = points.filter(pt => pt.event && pt.event.type !== 'start' && pt.event.type !== 'end');
  return { points, incidents };
}

// 2D G-Force IMU Crosshair Widget
export function GForceMeter({ latG = 0, longG = 0, gForce = 0.05 }) {
  // Normalize into -100% to +100% space (clamped to max 0.6g)
  const maxScale = 0.55;
  const clampedX = Math.max(-maxScale, Math.min(maxScale, latG));
  const clampedY = Math.max(-maxScale, Math.min(maxScale, longG));
  const posX = 50 + (clampedX / maxScale) * 40; // in %
  const posY = 50 - (clampedY / maxScale) * 40; // in % (positive accel is forward/up)

  const isHighG = gForce >= 0.35;
  const isMedG = gForce >= 0.2;

  return (
    <div className="imu-gforce-meter" title={`Lateral: ${latG}g · Longitudinal: ${longG}g · Total: ${gForce}g`}>
      <div className="imu-grid">
        <span className="imu-axis x-axis" />
        <span className="imu-axis y-axis" />
        <span className="imu-ring r-outer" />
        <span className="imu-ring r-inner" />
        <span
          className={`imu-dot ${isHighG ? 'high-g' : isMedG ? 'med-g' : ''}`}
          style={{ left: `${posX}%`, top: `${posY}%` }}
        />
      </div>
      <div className="imu-label">
        <b>{gForce.toFixed(2)} G</b>
        <small>{latG >= 0 ? `+${latG}` : latG}x / {longG >= 0 ? `+${longG}` : longG}y</small>
      </div>
    </div>
  );
}

// The Floating Dashcam & Movement Inspector Card
export function DashcamHoverCard({ telemetryPt, vehicle, onMouseEnter, onMouseLeave }) {
  if (!telemetryPt) return null;
  return (
    <div className="replay-snapshot-card" role="region" aria-label="Camera snapshot" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <img src={telemetryPt.dashcam.frontImg} alt="Road camera snapshot" />
      <div className="replay-snapshot-meta">
        <span><Clock3 size={14} aria-hidden="true" />31 Oct 2026 · {telemetryPt.timeStr} IST</span>
        <span><MapPin size={14} aria-hidden="true" />{vehicle?.location || 'Location unavailable'}</span>
      </div>
    </div>
  );
}

// Fullscreen HD Dashcam Inspection Studio Modal
export function DashcamStudioModal({
  vehicle,
  initialProgress = 0,
  telemetry,
  onClose,
  onSyncReplay
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [mainCam, setMainCam] = useState('front'); // 'front' or 'cabin'
  const [showAi, setShowAi] = useState(true);
  const [exportNotice, setExportNotice] = useState('');

  const pts = telemetry?.points || [];
  const currentPt = pts[progress] || pts[0];

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, p + playSpeed);
      });
    }, 350);
    return () => clearInterval(interval);
  }, [playing, playSpeed]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentPt) return null;

  const { movement, dashcam, timeStr, event } = currentPt;

  const handleExportFrame = () => {
    setExportNotice(`Exported Frame: ${vehicle?.id || 'VY'}_${timeStr.replace(/:/g, '')}.jpg`);
    setTimeout(() => setExportNotice(''), 3000);
  };

  const frontImg = dashcam.frontImg;
  const cabinImg = dashcam.cabinImg;

  const primaryImg = mainCam === 'front' ? frontImg : cabinImg;
  const pipImg = mainCam === 'front' ? cabinImg : frontImg;

  const keyMilestones = [
    { p: 0, label: 'Depot Start', time: '09:52' },
    { p: 12, label: 'Harsh Accel', time: '09:58' },
    { p: 38, label: 'Austin Stop', time: '10:11' },
    { p: 52, label: 'Speed Alert', time: '10:18' },
    { p: 65, label: 'Harsh Turn', time: '10:25' },
    { p: 78, label: 'Harsh Brake', time: '10:31' },
    { p: 100, label: 'Whitefield Hub', time: '10:42' }
  ];

  return (
    <div className="dashcam-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dashcam-studio-window" onClick={e => e.stopPropagation()}>
        {/* Studio Window Header */}
        <div className="studio-header">
          <div className="studio-title-group">
            <span className="studio-tag">
              <Camera size={13} /> VIDEO REPLAY STUDIO
            </span>
            <h2>
              {vehicle?.id || 'VY-1001'} · {vehicle?.name || 'Commercial EV'}
            </h2>
            <p>
              Driver: <b>{vehicle?.driver || 'Rahul Mehta'}</b> · Date: <b>31 Oct 2026</b> · {movement.locationName}
            </p>
          </div>

          <div className="studio-header-actions">
            <span className="studio-rec-pill">
              <span className="rec-dot" /> LIVE RECORDING
            </span>
            <button
              type="button"
              className="studio-btn-subtle"
              onClick={handleExportFrame}
              title="Export high-resolution snapshot"
            >
              <Download size={14} /> Export Frame
            </button>
            <button
              type="button"
              className="studio-close-btn"
              onClick={onClose}
              aria-label="Close Studio"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {exportNotice && <div className="studio-toast">{exportNotice}</div>}

        {/* Main 16:9 Video Canvas with PiP secondary camera */}
        <div className="studio-screen-wrap">
          <div className="studio-main-screen">
            <img src={primaryImg} alt="Primary Camera Angle" className="studio-primary-img" />
            <div className="dashcam-lens-vignette" />

            {/* OSD Top Bar */}
            <div className="dashcam-osd osd-top studio-osd">
              <span>
                {mainCam === 'front' ? 'CAM-01 [1080p60 · HDR] FRONT ROAD' : 'CAM-02 [1080p60 · DMS] IN-CABIN DRIVER'}
              </span>
              <span>GPS: 12.9734° N, 77.6210° E · 11 SATELLITES</span>
            </div>

            {/* AI Vision ADAS Bounding Boxes */}
            {showAi && (
              <div className="dashcam-ai-overlay">
                {mainCam === 'front' ? (
                  <>
                    <div
                      className="ai-bounding-box studio-box"
                      style={{
                        top: `${movement.aiDetection.box.top}%`,
                        left: `${movement.aiDetection.box.left}%`,
                        width: `${movement.aiDetection.box.width}%`,
                        height: `${movement.aiDetection.box.height}%`
                      }}
                    >
                      <span className="ai-box-tag">{movement.aiDetection.box.label} · Safe following distance</span>
                    </div>
                    <div className="ai-lane-guide left-lane" />
                    <div className="ai-lane-guide right-lane" />
                  </>
                ) : (
                  <div className="ai-driver-box studio-driver-box">
                    <span className="ai-driver-tag">
                      <ShieldCheck size={13} /> {movement.aiDetection.driverScore} · Eyes on road · Seatbelt OK
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* OSD Bottom Bar */}
            <div className="dashcam-osd osd-bottom studio-osd">
              <span>2026-10-31 {timeStr} IST · {movement.locationName}</span>
              <span>
                <b>{movement.speed} KM/H</b> · {movement.gear} · {movement.rpm} RPM
              </span>
            </div>

            {/* Picture-in-Picture (PiP) Window for secondary camera angle */}
            <div
              className="studio-pip-window"
              onClick={() => setMainCam(mainCam === 'front' ? 'cabin' : 'front')}
              title="Click to swap main view with Picture-in-Picture angle"
            >
              <img src={pipImg} alt="Secondary PiP Camera Angle" />
              <div className="pip-label">
                <span>{mainCam === 'front' ? 'Cabin Cam (DMS)' : 'Road Cam (Front)'}</span>
                <small>Click to swap</small>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Waveform & Time Controls Bar */}
        <div className="studio-telemetry-panel">
          <div className="studio-controls-row">
            <div className="playback-buttons-group">
              <button
                type="button"
                className="studio-play-btn"
                onClick={() => {
                  if (progress >= 100) setProgress(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                className="studio-restart-btn"
                onClick={() => setProgress(0)}
                title="Restart from trip start"
              >
                <RotateCcw size={14} />
              </button>

              <label className="studio-speed-select">
                Speed
                <select value={playSpeed} onChange={e => setPlaySpeed(Number(e.target.value))}>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={4}>4×</option>
                </select>
              </label>

              <button
                type="button"
                className={`studio-toggle-chip ${showAi ? 'active' : ''}`}
                onClick={() => setShowAi(!showAi)}
              >
                {showAi ? <Eye size={13} /> : <EyeOff size={13} />} AI Vision Overlays
              </button>
            </div>

            <div className="studio-telemetry-pills">
              <span className="telemetry-pill">
                <Gauge size={13} /> <b>{movement.speed} km/h</b> <small>(Limit {movement.speedLimit})</small>
              </span>
              <span className="telemetry-pill">
                <Activity size={13} /> <b>{movement.gForce.toFixed(2)} G</b> <small>Inertia</small>
              </span>
              <span className="telemetry-pill">
                <Compass size={13} /> <b>{movement.distance}</b> <small>({progress}%)</small>
              </span>
              <span className="telemetry-pill">
                <Clock3 size={13} /> <b>{timeStr} IST</b>
              </span>
            </div>

            <button
              type="button"
              className="studio-sync-map-btn"
              onClick={() => {
                onSyncReplay && onSyncReplay(progress);
                onClose();
              }}
              title="Sync map view to this moment"
            >
              <Truck size={14} /> Sync to Map Replay
            </button>
          </div>

          {/* Scrubber Range Slider with Milestone Jump Chips */}
          <div className="studio-scrubber-wrap">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={e => {
                setPlaying(false);
                setProgress(Number(e.target.value));
              }}
              className="studio-slider"
              aria-label="Trip scrub position"
            />

            {/* Quick Milestones Row */}
            <div className="studio-milestones-row">
              {keyMilestones.map(m => (
                <button
                  type="button"
                  key={m.p}
                  className={`milestone-chip ${progress === m.p ? 'active' : ''}`}
                  onClick={() => { setPlaying(false); setProgress(m.p); }}
                >
                  <b>{m.time}</b> {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scrubber Hover Thumbnail Preview
export function DashcamScrubberPreview({ progress, telemetry, rect }) {
  if (progress === null || progress === undefined || !telemetry) return null;
  const pt = telemetry.points?.[progress];
  if (!pt) return null;

  return (
    <div
      className="scrubber-dashcam-preview"
      style={{ left: rect ? `${rect.x}px` : '50%' }}
    >
      <img src={pt.dashcam.frontImg} alt="Scrub preview" className="scrubber-preview-thumb" />
      <div className="scrubber-preview-meta">
        <b>{pt.timeStr} IST</b>
        <span>{pt.speed} km/h · {pt.progress}%</span>
      </div>
    </div>
  );
}
