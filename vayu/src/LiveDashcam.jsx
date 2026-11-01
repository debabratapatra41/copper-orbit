import React, { useEffect, useRef, useState } from 'react';
import { Camera, CircleHelp, Pause, Play, Video } from 'lucide-react';
import './LiveDashcam.css';

const cameras = {
  front: { label: 'Front dashcam', images: ['dashcam_city_traffic.jpg', 'dashcam_highway_cruise.jpg', 'dashcam_depot_start.jpg'] },
  driver: { label: 'Driver dashcam', images: ['dashcam_cabin_driver.jpg'] },
};
const imageUrl = name => `${import.meta.env.BASE_URL}dashcam/${name}`;

export default function LiveDashcam({ credits, setCredits }) {
  const [view, setView] = useState('front');
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const lastCharged = useRef(0);
  const camera = cameras[view];
  const image = imageUrl(camera.images[Math.floor(seconds / 5) % camera.images.length]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (!playing || !seconds || seconds % 20 !== 0 || lastCharged.current === seconds) return;
    lastCharged.current = seconds;
    setCredits(value => Math.max(0, value - 1));
  }, [seconds, playing, setCredits]);
  useEffect(() => { if (credits <= 0) setPlaying(false); }, [credits]);

  const changeView = key => { setView(key); setPlaying(false); setSeconds(0); lastCharged.current = 0; setExpanded(false); };
  return <section className="detail-section live-dashcam" aria-labelledby="live-dashcam-heading">
    <div className="live-dashcam-heading"><div><h3 id="live-dashcam-heading">Dashcam</h3><span>Camera preview & recent snapshot</span></div><div className="dashcam-credits"><b>{credits.toLocaleString()}</b><span>preview credits</span></div></div>
    <div className="dashcam-rate"><CircleHelp size={15} aria-hidden="true" /><span>1 credit per 20 seconds, per camera view</span></div>
    <div className="live-camera-switch" role="group" aria-label="Choose dashcam view">{Object.entries(cameras).map(([key, item]) => <button type="button" key={key} aria-pressed={view === key} onClick={() => changeView(key)}>{key === 'front' ? <Video size={15} /> : <Camera size={15} />}{item.label}</button>)}</div>
    <div className="live-camera-screen"><img src={image} alt={`${camera.label} camera preview`} /><div className="live-camera-screen-overlay" /><div className="live-camera-status"><span className="demo-dot" />{playing ? 'PREVIEW PLAYING' : 'CAMERA PREVIEW'}</div><span className="live-camera-screen-note">Still images · Camera feed not connected</span></div>
    <div className="live-camera-controls"><div><b>{camera.label}</b><span>{playing ? `${seconds}s viewed` : 'One camera view at a time'}</span></div><button type="button" className="co-button dashcam-demo-button" disabled={!playing && credits <= 0} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Stop viewing' : 'Start preview'}</button></div>
    <p className="dashcam-demo-note">Preview credits are simulated; no actual credits are used.</p>
    <div className="dashcam-snapshot-heading"><h4>Recent snapshot</h4></div>
    <div className="dashcam-snapshot-row"><img src={imageUrl(camera.images[0])} alt={`${camera.label} snapshot preview`} /><div><b>{camera.label}</b><span>Snapshot preview</span><button type="button" className="dashcam-snapshot-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide snapshot' : 'View snapshot'}</button></div></div>
    {expanded && <div className="dashcam-snapshot-expanded"><img src={imageUrl(camera.images[0])} alt={`${camera.label} snapshot preview, expanded`} /></div>}
  </section>;
}
