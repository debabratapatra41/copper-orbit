import roadRoutes from './fleet-road-routes.json';

// Reusable OSRM routes over OpenStreetMap roads; no routing requests run in the browser.
const radians = value => value * Math.PI / 180;
function distance(a, b) {
  const lat1 = radians(a[1]), lat2 = radians(b[1]);
  const dLat = lat2 - lat1, dLon = radians(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function prepareRoute(route) {
  const cumulative = [0];
  for (let i = 1; i < route.coordinates.length; i++) cumulative.push(cumulative[i - 1] + distance(route.coordinates[i - 1], route.coordinates[i]));
  return { coordinates: route.coordinates, cumulative, length: cumulative[cumulative.length - 1] };
}
const routes = Object.fromEntries(Object.entries(roadRoutes).map(([city, cityRoutes]) => [city, cityRoutes.map(prepareRoute)]));
const placementCache = new WeakMap();

function getPlacements(vehicles) {
  if (placementCache.has(vehicles)) return placementCache.get(vehicles);
  const totals = new Map();
  vehicles.forEach(vehicle => totals.set(vehicle.location, (totals.get(vehicle.location) || 0) + 1));
  const seen = new Map();
  const placements = vehicles.map(vehicle => {
    const choices = routes[vehicle.location];
    if (!choices?.length) return null;
    const ordinal = seen.get(vehicle.location) || 0;
    seen.set(vehicle.location, ordinal + 1);
    const routeIndex = ordinal % choices.length;
    const slot = Math.floor(ordinal / choices.length);
    const slots = Math.floor((totals.get(vehicle.location) - 1 - routeIndex) / choices.length) + 1;
    return { route: choices[routeIndex], routeIndex, fraction: (slot + 0.5) / slots };
  });
  placementCache.set(vehicles, placements);
  return placements;
}

function positionOnRoute(route, metres) {
  const target = ((metres % route.length) + route.length) % route.length;
  let low = 1, high = route.cumulative.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (route.cumulative[mid] < target) low = mid + 1; else high = mid;
  }
  const a = route.coordinates[low - 1], b = route.coordinates[low];
  const span = route.cumulative[low] - route.cumulative[low - 1];
  const ratio = span ? (target - route.cumulative[low - 1]) / span : 0;
  const lat = a[1] + (b[1] - a[1]) * ratio;
  const lng = a[0] + (b[0] - a[0]) * ratio;
  const y = Math.sin(radians(b[0] - a[0])) * Math.cos(radians(b[1]));
  const x = Math.cos(radians(a[1])) * Math.sin(radians(b[1])) - Math.sin(radians(a[1])) * Math.cos(radians(b[1])) * Math.cos(radians(b[0] - a[0]));
  return { position: [lat, lng], heading: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 };
}

export function simulateFleet(baseVehicles, elapsedSeconds, now) {
  const placements = getPlacements(baseVehicles);
  return baseVehicles.map((vehicle, index) => {
    const placement = placements[index];
    const route = placement?.route;
    if (!route || !route.length) return vehicle;
    // Spread vehicles across the full cycle so fleet states stay mixed over time.
    const phaseOffset = (index * 17) % 100;
    const elapsed = elapsedSeconds + phaseOffset;
    const cycle = 100, driving = 65, idling = 15;
    const phase = elapsed % cycle;
    const held = vehicle.sampleContext?.kind === 'offline' || vehicle.sampleContext?.kind === 'inspection';
    const motion = held ? 'stopped' : phase < driving ? 'moving' : phase < driving + idling ? 'idle' : 'stopped';
    const cruise = 28 + placement.routeIndex * 7 + vehicle.location.charCodeAt(0) % 4;
    const movingSeconds = held ? 0 : Math.floor(elapsed / cycle) * driving + Math.min(phase, driving);
    const initialMovingSeconds = held ? 0 : Math.min(phaseOffset, driving);
    const roadDistance = ((placement.fraction * route.length + (movingSeconds - initialMovingSeconds) * cruise / 3.6) % route.length + route.length) % route.length;
    const location = positionOnRoute(route, roadDistance);
    return {
      ...vehicle,
      ...location,
      roadRoute: route,
      roadDistance,
      hasAlert: vehicle.status === 'alert' || Boolean(vehicle.sampleContext?.title),
      status: motion,
      speed: `${motion === 'moving' ? cruise : 0} km/h`,
      updated: held && vehicle.sampleContext?.kind === 'offline' ? vehicle.updated : 'Now',
      updatedAt: held && vehicle.sampleContext?.kind === 'offline' ? vehicle.updatedAt : new Date(now),
    };
  });
}

// Build a continuous section of the same road geometry used to place the vehicle.
export function getRoadReplay(vehicle) {
  const route = vehicle?.roadRoute;
  if (!route?.length || !Number.isFinite(vehicle.roadDistance)) return [];
  const end = vehicle.roadDistance;
  const useReverse = end < Math.min(500, route.length / 4);
  const start = useReverse ? Math.min(route.length, end + 3000) : Math.max(0, end - 3000);
  const low = Math.min(start, end), high = Math.max(start, end);
  const points = [positionOnRoute(route, start === route.length ? route.length - 0.001 : start).position];
  const vertices = route.coordinates.filter((_, index) => route.cumulative[index] > low && route.cumulative[index] < high);
  if (useReverse) vertices.reverse();
  points.push(...vertices.map(([lng, lat]) => [lat, lng]));
  points.push(positionOnRoute(route, end).position);
  return points;
}

// Only connect positions on the same known road path; disconnected paths must not be joined by straight lines.
export function getNearbyRoadRoute(origin, destination) {
  const route = origin?.roadRoute;
  if (!route || route !== destination?.roadRoute || !Number.isFinite(origin.roadDistance) || !Number.isFinite(destination.roadDistance)) return null;
  const start = origin.roadDistance, end = destination.roadDistance;
  // Repeated vertices are genuine shared points in the stored path. Build a graph
  // from those connections so a repeated loop does not force a long detour.
  const nodes = new Map();
  const ensure = (key, coordinate) => { if (!nodes.has(key)) nodes.set(key, { coordinate, edges: [] }); };
  const connect = (a, b, metres) => { nodes.get(a).edges.push([b, metres]); nodes.get(b).edges.push([a, metres]); };
  const keyFor = coordinate => coordinate.join(',');
  route.coordinates.forEach(coordinate => ensure(keyFor(coordinate), coordinate));
  for (let i = 1; i < route.coordinates.length; i++) connect(keyFor(route.coordinates[i - 1]), keyFor(route.coordinates[i]), route.cumulative[i] - route.cumulative[i - 1]);
  const attach = (key, metres) => {
    const position = positionOnRoute(route, metres).position;
    ensure(key, [position[1], position[0]]);
    let index = 1;
    while (index < route.cumulative.length - 1 && route.cumulative[index] < metres) index++;
    connect(key, keyFor(route.coordinates[index - 1]), metres - route.cumulative[index - 1]);
    connect(key, keyFor(route.coordinates[index]), route.cumulative[index] - metres);
    return index;
  };
  const startIndex = attach('origin', start), endIndex = attach('destination', end);
  if (startIndex === endIndex) connect('origin', 'destination', Math.abs(end - start));
  const costs = new Map([['origin', 0]]), previous = new Map(), unvisited = new Set(nodes.keys());
  while (unvisited.size) {
    let current = null, best = Infinity;
    for (const key of unvisited) { const cost = costs.get(key) ?? Infinity; if (cost < best) { best = cost; current = key; } }
    if (current === null || current === 'destination') break;
    unvisited.delete(current);
    for (const [next, length] of nodes.get(current).edges) {
      if (!unvisited.has(next)) continue;
      const nextCost = best + length;
      if (nextCost < (costs.get(next) ?? Infinity)) { costs.set(next, nextCost); previous.set(next, current); }
    }
  }
  const metres = costs.get('destination');
  const direct = distance(nodes.get('origin').coordinate, nodes.get('destination').coordinate);
  // The bundled paths are incomplete; avoid presenting a large artificial detour.
  if (metres == null || metres > Math.max(500, direct * 4)) return null;
  const points = [];
  for (let key = 'destination'; key; key = previous.get(key)) {
    const [lng, lat] = nodes.get(key).coordinate;
    points.push([lat, lng]);
    if (key === 'origin') break;
  }
  points.reverse();
  const steps = [{ text: 'Start from the selected vehicle', metres: 0 }];
  let lastTurn = 0, travelled = 0;
  const bearing = (a, b) => Math.atan2((b[1] - a[1]) * Math.cos(radians((a[0] + b[0]) / 2)), b[0] - a[0]) * 180 / Math.PI;
  for (let i = 1; i < points.length - 1; i++) {
    travelled += distance([points[i - 1][1], points[i - 1][0]], [points[i][1], points[i][0]]);
    if (travelled - lastTurn < 75) continue;
    let before = i - 1, after = i + 1;
    while (before > 0 && distance([points[before][1], points[before][0]], [points[i][1], points[i][0]]) < 20) before--;
    while (after < points.length - 1 && distance([points[after][1], points[after][0]], [points[i][1], points[i][0]]) < 20) after++;
    const turn = ((bearing(points[i], points[after]) - bearing(points[before], points[i]) + 540) % 360) - 180;
    if (Math.abs(turn) >= 45) { steps.push({ text: `Turn ${turn > 0 ? 'right' : 'left'}`, metres: travelled }); lastTurn = travelled; }
  }
  steps.push({ text: 'Arrive at the nearby vehicle', metres });
  return { points, steps, metres, originId: origin.id, destinationId: destination.id };
}
