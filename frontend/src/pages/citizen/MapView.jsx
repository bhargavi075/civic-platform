import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Leaflet heatmap plugin (loaded dynamically via CDN) ──────────────────────
// We use leaflet.heat (https://github.com/Leaflet/Leaflet.heat)
// CDN: https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js
// The plugin attaches itself to the global L object when loaded.

function loadHeatPlugin() {
  return new Promise((resolve) => {
    if (window._leafletHeatLoaded) return resolve();
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js';
    script.onload = () => {
      window._leafletHeatLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ── Category / status colour maps ────────────────────────────────────────────
const categoryColors = {
  Roads: '#f59e0b',
  Municipal: '#10b981',
  Electricity: '#f43f5e',
  Water: '#3b82f6',
  Parks: '#22c55e',
  Other: '#8b5cf6',
};
const statusColors2 = {
  Pending: '#f59e0b',
  InProgress: '#3b82f6',
  Resolved: '#10b981',
};

const createMarkerIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

// ── HeatmapLayer component ────────────────────────────────────────────────────
// Renders as a child of <MapContainer> so it can access the Leaflet map instance.
const HeatmapLayer = ({ complaints, visible }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    // Ensure the plugin script is loaded before using L.heatLayer
    loadHeatPlugin().then(() => {
      // Remove old layer if it exists
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (!visible) return;

      // Build coordinate array — filter out any complaints with missing coords
      const heatPoints = complaints
        .filter(
          (c) =>
            typeof c.latitude === 'number' &&
            typeof c.longitude === 'number' &&
            !isNaN(c.latitude) &&
            !isNaN(c.longitude)
        )
        .map((c) => [c.latitude, c.longitude, 1]); // [lat, lng, intensity]

      if (heatPoints.length === 0) return;

      // ── Heatmap configuration ─────────────────────────────────────────────
      // Kept deliberately light and non-intrusive:
      //   radius   : 18px  — small blobs, no giant splatters
      //   blur     : 15px  — soft edges
      //   minOpacity: 0.15 — barely visible at sparse areas
      //   max      : 1.0   — normalised intensity
      //   gradient : soft red tones; transparent at 0 so base map shows through
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 18,
        blur: 15,
        minOpacity: 0.15,
        max: 1.0,
        gradient: {
          0.0: 'rgba(255,0,0,0)',      // fully transparent
          0.3: 'rgba(255,80,80,0.2)',  // very light pinkish-red
          0.6: 'rgba(255,30,30,0.35)', // soft red
          1.0: 'rgba(200,0,0,0.45)',   // mid red (never opaque)
        },
      });

      heatLayerRef.current.addTo(map);
    });

    // Cleanup on unmount
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, complaints, visible]);

  return null; // purely side-effect component
};

// ── Main MapView component ────────────────────────────────────────────────────
const MapView = () => {
  const { user } = useAuth();
  const { t } = useLang();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [colorBy, setColorBy] = useState('category');
  const [userPos, setUserPos] = useState(null);
  const [showRadius, setShowRadius] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true); // heatmap ON by default

  useEffect(() => {
    fetchComplaints();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await api.getComplaints();
      setComplaints(data);
    } catch (_) {}
    setLoading(false);
  };

  const filtered = complaints.filter(
    (c) => filter === 'all' || c.status === filter
  );

  const getColor = (c) => {
    if (colorBy === 'category') return categoryColors[c.category] || '#8b5cf6';
    return statusColors2[c.status] || '#gray';
  };

  return (
    <div className="min-h-screen bg-map flex flex-col">
      {user && <Navbar role="citizen" />}
      {!user && (
        <div className="bg-white border-b border-purple-100/60 shadow-sm px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold font-display text-sm">CV</span>
            </div>
            <span className="font-display font-bold text-gray-900">CivicVoice</span>
          </Link>
          <Link to="/citizen/login" className="btn-primary text-sm py-2">
            Sign In to Report
          </Link>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 bg-white border-r border-purple-100/60 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <h2 className="font-display font-bold text-lg text-gray-900">
            Complaints Map
          </h2>

          {/* Filter by Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Filter by Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {['all', 'Pending', 'InProgress', 'Resolved'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filter === f
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? t('all') : f === 'InProgress' ? t('inProgress') : f}
                </button>
              ))}
            </div>
          </div>

          {/* Color by */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Color by
            </label>
            <div className="flex gap-2">
              {['category', 'status'].map((v) => (
                <button
                  key={v}
                  onClick={() => setColorBy(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    colorBy === v
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Map Overlays */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">
              Map Overlays
            </label>

            {/* Heatmap toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showHeatmap"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="accent-purple-500"
              />
              <label htmlFor="showHeatmap" className="text-sm text-gray-600 cursor-pointer">
                Show complaint density heatmap
              </label>
            </div>

            {/* 1km radius toggle */}
            {userPos && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showRadius"
                  checked={showRadius}
                  onChange={(e) => setShowRadius(e.target.checked)}
                  className="accent-purple-500"
                />
                <label htmlFor="showRadius" className="text-sm text-gray-600 cursor-pointer">
                  Show 1km radius
                </label>
              </div>
            )}
          </div>

          {/* Heatmap legend */}
          {showHeatmap && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Density Legend
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-full rounded-full"
                  style={{
                    background:
                      'linear-gradient(to right, rgba(255,0,0,0.05), rgba(255,30,30,0.25), rgba(200,0,0,0.45))',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}

          {/* Category / status legend */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Marker Legend
            </label>
            <div className="space-y-1.5">
              {Object.entries(
                colorBy === 'category' ? categoryColors : statusColors2
              ).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600">{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complaint count */}
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="font-display font-bold text-2xl text-purple-700">
              {filtered.length}
            </p>
            <p className="text-primary-500 text-xs">complaints shown</p>
          </div>

          {/* Mini list */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Recent Issues
            </label>
            <div className="space-y-2">
              {filtered.slice(0, 5).map((c) => (
                <Link
                  key={c._id}
                  to={`/citizen/complaint/${c._id}`}
                  className="block p-3 bg-white/70 rounded-2xl hover:bg-purple-50 transition-colors"
                >
                  <p className="font-medium text-gray-800 text-xs truncate">{c.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {c.category} · {c.status}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 h-[70vh] lg:h-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading map...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={userPos || [17.385, 78.4867]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {/* ── Heatmap overlay (light, non-intrusive) ─────────────────
                  Uses ALL complaints (not just filtered) so density is always
                  accurate — the filtered markers reflect the active filter.
                  Pass `complaints` here for full density; swap to `filtered`
                  if you want density to respond to the status filter. ──── */}
              <HeatmapLayer complaints={complaints} visible={showHeatmap} />

              {/* 1 km radius circle */}
              {userPos && showRadius && (
                <Circle
                  center={userPos}
                  radius={1000}
                  color="#3b82f6"
                  fillColor="#3b82f620"
                  fillOpacity={0.2}
                />
              )}

              {/* Complaint markers */}
              {filtered
                .filter(c => c.latitude != null && c.longitude != null && !isNaN(c.latitude) && !isNaN(c.longitude))
                .map((c) => (
                <Marker
                  key={c._id}
                  position={[c.latitude, c.longitude]}
                  icon={createMarkerIcon(getColor(c))}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-sm mb-1">{c.title}</h3>
                      <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                        {c.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                        <span className="font-semibold">{c.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        👍 {c.votes} votes
                      </div>
                      <Link
                        to={`/citizen/complaint/${c._id}`}
                        className="block mt-2 text-center text-xs bg-blue-600 text-white py-1 rounded-lg"
                      >
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
