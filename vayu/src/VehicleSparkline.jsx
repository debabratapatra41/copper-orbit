import React, { useState } from 'react';
import { Activity, Gauge } from 'lucide-react';

export default function VehicleSparkline({ speed, updatedAt, vehicleId }) {
  const [metric, setMetric] = useState('speed');
  const [hover, setHover] = useState(null);
  const current = parseInt(speed, 10) || 0;
  const speedValues = current === 0 ? [12,17,14,9,5,0,0,0] : [0.45,0.7,0.6,0.85,0.65,1,0.8,1].map(v => Math.round(current*v));
  const acceleration = [0.1,0.4,-0.2,0.5,-0.3,0.3,-0.2,0.1];
  const scenario = Number(vehicleId.slice(3)) % 4;
  const values = (metric === 'speed' ? speedValues : acceleration).map((value,index) => scenario === 1 && index < 3 || scenario === 2 && (index === 3 || index === 4) || scenario === 3 ? null : value);
  const available = values.filter(value => value !== null);
  const min = Math.min(0,...available), max = Math.max(1,...available), range = max-min;
  const points = values.map((value, index) => value === null ? null : ({ x: 4 + index * 20, y: 25 - (value-min)/range*20, value, minutes: Math.round((values.length - 1 - index)*60/(values.length-1)) }));
  const segments = [];
  points.forEach(point => { if (!point) { if (segments.length && segments[segments.length-1].length) segments.push([]); } else { if (!segments.length) segments.push([]); segments[segments.length-1].push(point); } });
  const label = point => `${metric === 'speed' ? Math.round(point.value) : point.value.toFixed(1)} ${metric === 'speed' ? 'km/h' : 'm/s²'} · ${new Date(updatedAt.getTime()-point.minutes*60000).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit'})} IST`;
  const readingAt = x => {
    for (const segment of segments) {
      for (let index = 0; index < segment.length; index++) {
        const start = segment[index];
        if (Math.abs(x - start.x) < 0.5) return { ...start, x };
        const end = segment[index + 1];
        if (end && x > start.x && x < end.x) {
          const ratio = (x - start.x) / (end.x - start.x);
          return {
            x,
            y: start.y + (end.y - start.y) * ratio,
            value: start.value + (end.value - start.value) * ratio,
            minutes: start.minutes + (end.minutes - start.minutes) * ratio,
          };
        }
      }
    }
    return null;
  };
  const handlePointerMove = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(4, Math.min(144, (event.clientX - bounds.left) / bounds.width * 148));
    setHover({ x, reading: readingAt(x) });
  };
  return <div className="sparkline-wrap">
    <div className="sparkline-switch" role="group" aria-label="Graph metric">
      <button type="button" aria-label="Speed graph" title="Speed" aria-pressed={metric==='speed'} onClick={()=>{setMetric('speed');setHover(null)}}><Gauge size={14}/></button>
      <button type="button" aria-label="Acceleration graph" title="Acceleration" aria-pressed={metric==='acceleration'} onClick={()=>{setMetric('acceleration');setHover(null)}}><Activity size={14}/></button>
    </div>
    <span className="sparkline-period">Last 60 min{available.length > 0 && available.length < values.length ? ' · Partial data' : ''}</span>
    <div className="sparkline-chart" onPointerMove={handlePointerMove} onPointerLeave={()=>setHover(null)}>
      {available.length ? <svg viewBox="0 0 148 30" preserveAspectRatio="none" role="img" aria-label={`${metric} over the last 60 minutes${available.length < values.length ? ', with missing data' : ''}`}>
        {segments.map((segment,index)=><polyline key={index} points={segment.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>)}
        {hover && <line className="sparkline-guide" x1={hover.x} x2={hover.x} y1="0" y2="30"/>}
        {points.map((point,index)=>point && <circle key={index} cx={point.x} cy={point.y} r="5" fill="transparent" tabIndex="0" aria-label={label(point)} onFocus={()=>setHover({x:point.x,reading:point})} onBlur={()=>setHover(null)}/>)}
      </svg> : <span className="sparkline-empty">No data available for the last 60 min</span>}
      {hover?.reading && <span className="sparkline-hover-point" style={{left:`${hover.reading.x/148*100}%`,top:`${hover.reading.y/30*100}%`}} aria-hidden="true"/>}
      {hover && <div className="sparkline-tooltip" style={{left:`${Math.max(15,Math.min(85,hover.x/148*100))}%`}} role="tooltip">{hover.reading ? label(hover.reading) : 'No data at this time'}</div>}
    </div>
  </div>;
}
