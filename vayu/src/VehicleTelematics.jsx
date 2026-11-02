import React from 'react';
import './VehicleTelematics.css';

function numericId(id) { return Number(String(id || '').replace(/\D/g, '')) || 0; }
function makeGroups(vehicle) {
  const id = numericId(vehicle.id);
  const electric = /\bEV\b/i.test(vehicle.name || '');
  const moving = vehicle.status === 'moving';
  const running = moving || vehicle.status === 'idle';
  const speed = parseFloat(vehicle.speed) || 0;
  const level = Number.parseFloat(vehicle.fuel) || 0;
  const generatedVin = `SIM${String(id).padStart(14, '0')}`;
  const batteryVoltage = (running ? 13.6 + (id % 6) / 10 : 12.2 + (id % 5) / 10).toFixed(1);
  const groups = [
    { title: 'Vehicle information', items: [
      ['VIN', vehicle.vin || generatedVin], ['Odometer', `${(24500 + id * 7 % 80000).toLocaleString('en-IN')} km`],
      ['Trip distance', vehicle.trip || 'Not available'], ['Vehicle speed', vehicle.speed || 'Not available'],
      ['Ignition', running ? 'On' : 'Off'], ['12 V battery', `${batteryVoltage} V`]
    ] },
    { title: electric ? 'Battery & charging' : 'Fuel & engine', items: electric ? [
      ['Battery level', vehicle.fuel || 'Not available'], ['Estimated range', `${Math.round(level * 1.8)} km`],
      ['High-voltage battery', `${315 + id % 55} V`], ['Battery health', `${88 + id % 11}%`],
      ['Battery temperature', `${25 + id % 10} °C`], ['Charging state', 'Not available']
    ] : [
      ['Fuel level', vehicle.fuel || 'Not available'], ['Estimated range', `${Math.round(level * 4.2)} km`],
      ['Engine speed', `${running ? (moving ? 1150 + Math.round(speed * 24) : 750) : 0} rpm`],
      ['Coolant temperature', `${running ? 78 + id % 13 : 24 + id % 10} °C`],
      ['Engine load', running ? `${moving ? 30 + id % 35 : 12 + id % 8}%` : '0%'],
      ['Fuel consumption', moving ? `${(7.5 + id % 40 / 10).toFixed(1)} L/100 km` : 'Not available']
    ] },
    { title: electric ? 'Motor & driving' : 'Driving & chassis', items: electric ? [
      ['Motor speed', `${moving ? Math.round(speed * 60) : 0} rpm`], ['Motor temperature', `${running ? 42 + id % 20 : 24 + id % 8} °C`],
      ['Accelerator position', moving ? `${15 + id % 30}%` : '0%'], ['Brake pedal', 'Not available'],
      ['Gear position', moving ? 'Drive' : 'Not available'], ['Regenerative braking', 'Not available']
    ] : [
      ['Accelerator position', moving ? `${15 + id % 30}%` : '0%'], ['Brake pedal', 'Not available'],
      ['Gear position', 'Not available'], ['Engine hours', `${(450 + id * 3 % 4200).toLocaleString('en-IN')} h`],
      ['Tyre pressure', 'Not available'], ['Ambient temperature', `${18 + id % 17} °C`]
    ] }
  ];
  return groups;
}
export default function VehicleTelematics({ vehicle }) {
  return <div className="vehicle-telematics"><p className="telematics-notice">Generated values · Vehicle data not connected</p>{makeGroups(vehicle).map(group => <section key={group.title} className="telematics-group"><h4>{group.title}</h4><div className="telematics-grid">{group.items.map(([label, value]) => <div key={label} className={label === 'VIN' ? 'telematics-wide' : undefined}><span>{label}</span><b>{value}</b></div>)}</div></section>)}<p className="telematics-footnote">Available signals vary by vehicle and connected hardware.</p></div>;
}
