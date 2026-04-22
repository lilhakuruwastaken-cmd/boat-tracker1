'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./components/Map'), { ssr: false });

interface Boat {
  id: string;
  name: string;
  liveData?: any;
}

interface Trip {
  id: string;
  startDate: string;
  endDate: string | null;
  keep: boolean;
  points: { lat: number; lng: number }[];
}

export default function Home() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [activeBoatId, setActiveBoatId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newBoatId, setNewBoatId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBoats = useCallback(async () => {
    try {
      const res = await fetch('/api/boats');
      const data = await res.json();
      
      // Fetch live data for all boats in parallel
      const boatsWithLive = await Promise.all(
        data.map(async (boat: Boat) => {
          try {
            const liveRes = await fetch(`/api/boats/${boat.id}`);
            boat.liveData = await liveRes.json();
          } catch (e) {
            boat.liveData = null;
          }
          return boat;
        })
      );
      setBoats(boatsWithLive);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTrips = async (boatId: string) => {
    const res = await fetch(`/api/trips/${boatId}`);
    const data = await res.json();
    setTrips(data);
  };

  useEffect(() => {
    fetchBoats();
    const interval = setInterval(fetchBoats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchBoats]);

  const handleAddBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoatId) return;
    setLoading(true);
    await fetch('/api/boats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newBoatId })
    });
    setNewBoatId('');
    fetchBoats();
    setLoading(false);
  };

  const handleDeleteBoat = async (id: string) => {
    await fetch(`/api/boats/${id}`, { method: 'DELETE' });
    if (activeBoatId === id) {
      setActiveBoatId(null);
      setTrips([]);
    }
    fetchBoats();
  };

  const handleSelectBoat = (id: string) => {
    setActiveBoatId(id);
    setIsSheetOpen(true);
    fetchTrips(id);
  };

  const toggleKeep = async (tripId: string) => {
    await fetch(`/api/trips/keep/${tripId}`, { method: 'PATCH' });
    if (activeBoatId) fetchTrips(activeBoatId);
  };

  const activeBoat = boats.find(b => b.id === activeBoatId);
  const live = activeBoat?.liveData?.devices?.[activeBoatId];

  return (
    <main className="relative w-full h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Map */}
      <Map boats={boats} activeBoatId={activeBoatId} onBoatClick={handleSelectBoat} />

      {/* Top Search Bar / Add Boat */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="bg-white rounded-xl shadow-lg p-3 flex-1 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <form onSubmit={handleAddBoat} className="flex-1 flex">
            <input 
              type="text"
              placeholder="Enter new Boat ID..."
              className="w-full outline-none text-sm text-gray-700"
              value={newBoatId}
              onChange={(e) => setNewBoatId(e.target.value)}
            />
            <button type="submit" disabled={loading} className="ml-2 bg-blue-600 text-white px-4 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : 'Add'}
            </button>
          </form>
        </div>
      </div>

      {/* Floating Boat List (Desktop / Map background) */}
      <div className="absolute top-20 left-4 z-10 hidden md:block w-72 max-h-[60vh] overflow-y-auto bg-white/80 backdrop-blur-md rounded-xl shadow-lg">
        <div className="p-4 border-b font-bold text-gray-800">My Fleet</div>
        {boats.length === 0 && <div className="p-4 text-sm text-gray-500">No boats added.</div>}
        {boats.map(boat => {
          const isMoving = (boat.liveData?.devices?.[boat.id]?.sp || 0) >= 0.5;
          return (
            <div key={boat.id} onClick={() => handleSelectBoat(boat.id)} className={`p-4 border-b cursor-pointer hover:bg-blue-50 flex justify-between items-center ${activeBoatId === boat.id ? 'bg-blue-50' : ''}`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-800">{boat.name}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteBoat(boat.id); }} className="text-gray-400 hover:text-red-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Bottom Sheet (Mobile Google Maps Style) */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 md:hidden ${isSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2" onClick={() => setIsSheetOpen(!isSheetOpen)}>
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {!activeBoatId ? (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">My Fleet</h2>
            {boats.map(boat => {
              const isMoving = (boat.liveData?.devices?.[boat.id]?.sp || 0) >= 0.5;
              return (
                <div key={boat.id} onClick={() => handleSelectBoat(boat.id)} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-xl active:bg-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="font-medium">{boat.name}</div>
                      <div className="text-xs text-gray-500">ID: {boat.id}</div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBoat(boat.id); }} className="text-red-500 p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {/* Boat Info Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-xl">{activeBoat?.name}</h2>
                <p className="text-sm text-gray-500">ID: {activeBoatId}</p>
              </div>
              <button onClick={() => { setActiveBoatId(null); setTrips([]); }} className="text-blue-600 font-medium text-sm mt-1">Close</button>
            </div>

            {live ? (
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="bg-gray-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">Speed</div>
                  <div className="font-bold text-lg">{(live.sp || 0).toFixed(1)}</div>
                  <div className="text-xs text-gray-400">NM/h</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">Heading</div>
                  <div className="font-bold text-lg">{live.he || 0}°</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className={`font-bold text-sm ${parseFloat(live.sp) >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(live.sp) >= 0.5 ? 'Moving' : 'Stopped'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">Waiting for data...</div>
            )}

            {/* Trips List */}
            <h3 className="font-bold text-gray-700 mb-3 border-t pt-4">Recent Trips (Max 10)</h3>
            {trips.length === 0 && <p className="text-sm text-gray-400">No trips recorded yet.</p>}
            {trips.map(trip => (
              <div key={trip.id} className="flex items-center justify-between p-3 mb-2 border rounded-xl hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">
                    {new Date(trip.startDate).toLocaleDateString()} - {trip.endDate ? new Date(trip.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ongoing'}
                  </div>
                  <div className="text-xs text-gray-400">{trip.points.length} points recorded</div>
                </div>
                <button onClick={() => toggleKeep(trip.id)} className="text-2xl">
                  {trip.keep ? '⭐' : '☆'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}