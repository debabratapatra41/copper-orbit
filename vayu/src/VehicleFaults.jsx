import React, { useMemo, useState } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import './VehicleFaults.css';

function makeFaults(vehicle) {
  const id = Number(String(vehicle.id || '').replace(/\D/g, '')) || 0;
  const electric = /\bEV\b/i.test(vehicle.name || '');
  const now = Date.now();
  const date = offset => new Date(now - offset * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return [
    { code: electric ? 'P0562' : 'P0300', title: electric ? 'System voltage low' : 'Random or multiple cylinder misfire detected', status: 'Active', module: electric ? 'Powertrain control module' : 'Engine control module', first: date(3 + id % 3), last: date(0), occurrences: 1 + id % 4, odometer: `${(24500 + id * 7 % 80000).toLocaleString('en-IN')} km` },
    { code: electric ? 'U0100' : 'P0562', title: electric ? 'Lost communication with ECM/PCM' : 'System voltage low', status: 'Historical', module: electric ? 'Communication network' : 'Powertrain control module', first: date(21 + id % 8), last: date(14 + id % 5), occurrences: 1 + id % 2, odometer: `${(24100 + id * 7 % 80000).toLocaleString('en-IN')} km` }
  ];
}
export default function VehicleFaults({ vehicle }) {
  const [filter, setFilter] = useState('all');
  const faults = useMemo(() => makeFaults(vehicle), [vehicle.id, vehicle.name]);
  const filtered = faults.filter(fault => filter === 'all' || fault.status.toLowerCase() === filter);
  return <div className="faults-content">
    <p className="faults-notice">Generated records · Diagnostics not connected</p>
    <div className="faults-summary"><div><span>Active</span><b>{faults.filter(fault => fault.status === 'Active').length}</b></div><div><span>Historical</span><b>{faults.filter(fault => fault.status === 'Historical').length}</b></div><div><span>Last diagnostic scan</span><b>Not available</b></div></div>
    <div className="faults-filters" role="group" aria-label="Filter fault codes">{[['all', 'All'], ['active', 'Active'], ['historical', 'Historical']].map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <div className="faults-list">{filtered.length ? filtered.map(fault => <details className="fault-record" key={fault.code}><summary><span className="fault-icon"><CircleAlert size={16} aria-hidden="true" /></span><span className="fault-heading"><b>{fault.code}</b><small>{fault.title}</small></span><span className={`fault-status ${fault.status === 'Active' ? 'is-active' : ''}`}>{fault.status}</span><ChevronDown size={15} className="fault-chevron" aria-hidden="true" /></summary><div className="fault-details"><div><span>Reporting system</span><b>{fault.module}</b></div><div><span>First reported</span><b>{fault.first}</b></div><div><span>Last reported</span><b>{fault.last}</b></div><div><span>Occurrences</span><b>{fault.occurrences}</b></div><div><span>Recorded odometer</span><b>{fault.odometer}</b></div><div><span>Malfunction indicator</span><b>Not available</b></div></div></details>) : <p className="faults-empty">No fault records in this view.</p>}</div>
    <p className="faults-footnote">Code meaning and severity can vary by vehicle. Connected diagnostic data is required to confirm a fault.</p>
  </div>;
}
