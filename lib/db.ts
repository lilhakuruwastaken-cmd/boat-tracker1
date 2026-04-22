import { kv } from '@vercel/kv';

export interface Boat {
  id: string;
  name: string;
}

export interface TripPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  status: 'Moving' | 'Stationary';
}

export interface Trip {
  id: string;
  boatId: string;
  startDate: string;
  endDate: string | null;
  points: TripPoint[];
  keep: boolean;
}

export interface BoatState {
  isMoving: boolean;
  currentTripId: string | null;
}

// --- BOATS ---
export async function getBoats(): Promise<Boat[]> {
  const boats = await kv.get<Boat[]>('boats');
  return boats || [];
}

export async function saveBoat(boat: Boat) {
  const boats = await getBoats();
  if (!boats.find(b => b.id === boat.id)) {
    boats.push(boat);
    await kv.set('boats', boats);
  }
}

export async function deleteBoat(boatId: string) {
  let boats = await getBoats();
  boats = boats.filter(b => b.id !== boatId);
  await kv.set('boats', boats);
  // Optional: delete all trips for this boat
}

// --- TRIPS & TRACKING ---
export async function processBoatTracking(boatId: string, data: any) {
  if (!data || data.status !== "ok" || !data.devices || !data.devices[boatId]) return;

  const boat = data.devices[boatId];
  const lat = parseFloat(boat.la);
  const lng = parseFloat(boat.lo);
  const speed = parseFloat(boat.sp) || 0;
  const isMoving = speed >= 0.5;
  const now = new Date().toISOString();

  const stateKey = `state:${boatId}`;
  let state = await kv.get<BoatState>(stateKey) || { isMoving: false, currentTripId: null };

  const newPoint: TripPoint = { lat, lng, timestamp: now, speed, status: isMoving ? 'Moving' : 'Stationary' };

  if (isMoving && !state.isMoving) {
    // START NEW TRIP
    const tripId = `trip_${Date.now()}`;
    const newTrip: Trip = {
      id: tripId,
      boatId,
      startDate: now,
      endDate: null,
      points: [newPoint],
      keep: false
    };
    await kv.set(`trip:${tripId}`, newTrip);
    await kv.lpush(`trips_index:${boatId}`, tripId); // Add to index
    state = { isMoving: true, currentTripId: tripId };
  } else if (isMoving && state.isMoving && state.currentTripId) {
    // CONTINUE TRIP
    const trip = await kv.get<Trip>(`trip:${state.currentTripId}`);
    if (trip) {
      trip.points.push(newPoint);
      await kv.set(`trip:${state.currentTripId}`, trip);
    }
  } else if (!isMoving && state.isMoving && state.currentTripId) {
    // END TRIP
    const trip = await kv.get<Trip>(`trip:${state.currentTripId}`);
    if (trip) {
      trip.points.push(newPoint);
      trip.endDate = now;
      await kv.set(`trip:${state.currentTripId}`, trip);
    }
    state = { isMoving: false, currentTripId: null };
  }

  await kv.set(stateKey, state);
  cleanOldTrips(boatId);
}

export async function getRecentTrips(boatId: string, limit = 10): Promise<Trip[]> {
  const tripIds = await kv.lrange(`trips_index:${boatId}`, 0, limit - 1);
  if (!tripIds || tripIds.length === 0) return [];

  const trips = await Promise.all(
    tripIds.map(id => kv.get<Trip>(`trip:${id}`))
  );
  
  return trips.filter(Boolean).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

export async function toggleKeepTrip(tripId: string) {
  const trip = await kv.get<Trip>(`trip:${tripId}`);
  if (trip) {
    trip.keep = !trip.keep;
    await kv.set(`trip:${tripId}`, trip);
    return trip.keep;
  }
  return false;
}

async function cleanOldTrips(boatId: string) {
  const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
  const allTripIds = await kv.lrange(`trips_index:${boatId}`, 0, -1);
  
  for (const id of allTripIds) {
    const trip = await kv.get<Trip>(`trip:${id}`);
    if (trip && !trip.keep) {
      const endDate = trip.endDate ? new Date(trip.endDate).getTime() : new Date(trip.startDate).getTime();
      if (endDate < threeDaysAgo) {
        // Delete trip and remove from index
        await kv.del(`trip:${id}`);
        await kv.lrem(`trips_index:${boatId}`, 0, id);
      }
    }
  }
}