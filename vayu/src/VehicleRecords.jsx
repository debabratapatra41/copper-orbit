import React, { useMemo, useState } from 'react';
import { ClipboardCheck, FileText, ChevronDown, Download, Wrench } from 'lucide-react';
import './VehicleRecords.css';

function createRecords(vehicle) {
  const seed = [...vehicle.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const km = 24000 + seed % 63000;
  const odometer = `${km.toLocaleString('en-IN')} km`;
  const service = ['Scheduled service', 'Brake system service', 'Preventive maintenance'][seed % 3];
  return {
    maintenance: [
      { id: `M-${vehicle.id}-01`, title: service, date: '24 Oct 2026', status: 'Completed', odometer, description: 'Inspection and scheduled service completed. Fluids, tyres, brakes and lights checked.', provider: `${vehicle.location} service centre` },
      { id: `M-${vehicle.id}-02`, title: 'Service inspection report', date: '12 Aug 2026', status: 'Completed', odometer: `${Math.max(0, km - 4800).toLocaleString('en-IN')} km`, description: 'Vehicle condition reviewed and routine maintenance items recorded.', provider: `${vehicle.location} service centre` },
    ],
    dvir: [
      { id: `I-${vehicle.id}-01`, title: 'Pre-trip inspection', date: '31 Oct 2026', status: 'Passed', odometer, driver: vehicle.driver, description: 'Brakes, tyres, lights, mirrors and safety equipment checked. No defects reported.' },
      { id: `I-${vehicle.id}-02`, title: 'Post-trip inspection', date: '30 Oct 2026', status: 'Passed', odometer: `${Math.max(0, km - 86).toLocaleString('en-IN')} km`, driver: vehicle.driver, description: 'End-of-trip vehicle condition checked. No defects reported.' },
    ],
  };
}

function downloadRecord(vehicle, record) {
  const contents = [record.title, '', `Vehicle: ${vehicle.id} · ${vehicle.name}`, `Record ID: ${record.id}`, `Date: ${record.date}`, `Status: ${record.status}`, `Odometer: ${record.odometer}`, record.driver && `Driver: ${record.driver}`, record.provider && `Service provider: ${record.provider}`, '', record.description, '', 'Generated record; not connected to a vehicle records system.'].filter(Boolean).join('\n');
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${record.id}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function VehicleRecords({ vehicle, hideHeading = false }) {
  const [view, setView] = useState('maintenance');
  const generated = useMemo(() => createRecords(vehicle), [vehicle.id]);
  const connected = view === 'maintenance' ? vehicle.maintenanceRecords : vehicle.dvirs;
  const records = connected ?? generated[view];
  return <section className="detail-section vehicle-records" aria-label={hideHeading ? 'Maintenance & inspections' : undefined} aria-labelledby={hideHeading ? undefined : 'vehicle-records-title'}>
    {!hideHeading && <div className="records-heading"><div><h3 id="vehicle-records-title">Maintenance & inspections</h3><p>Service documents and driver reports</p></div></div>}
    <div className="records-switch" role="group" aria-label="Vehicle records">
      <button type="button" aria-pressed={view === 'maintenance'} onClick={() => setView('maintenance')}><Wrench size={15} />Maintenance</button>
      <button type="button" aria-pressed={view === 'dvir'} onClick={() => setView('dvir')}><ClipboardCheck size={15} />DVIRs</button>
    </div>
    {!connected && <p className="records-generated">Generated records · Vehicle records not connected</p>}
    {records.length ? <div className="records-list">{records.map((record, index) => <details className="record-item" key={record.id || index}><summary><span className="record-icon">{view === 'maintenance' ? <FileText size={16} /> : <ClipboardCheck size={16} />}</span><span className="record-summary"><b>{record.title || (view === 'maintenance' ? 'Maintenance record' : 'Inspection report')}</b><small>{[record.date, record.status].filter(Boolean).join(' · ') || 'Date unavailable'}</small></span><ChevronDown size={16} /></summary><div className="record-body">{record.description && <p>{record.description}</p>}{record.odometer && <p>Odometer: {record.odometer}</p>}{record.driver && <p>Driver: {record.driver}</p>}{record.provider && <p>Service provider: {record.provider}</p>}{record.url ? <a href={record.url} target="_blank" rel="noopener noreferrer">Open document</a> : !connected && <button type="button" className="record-download" onClick={() => downloadRecord(vehicle, record)}><Download size={14} /> Download record</button>}</div></details>)}</div> : <div className="records-empty"><div><b>No records available</b></div></div>}
  </section>;
}
