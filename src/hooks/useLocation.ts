import { useState, useEffect, useCallback } from "react";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  timestamp: number;
}

interface UseLocationResult {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_KEY = "wise-user-location";
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export function useLocation(autoFetch: boolean = false): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as LocationData;
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error parsing cached location data:", error);
    }
    return null;
  });
  const [loading, setLoading] = useState(autoFetch && !location);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("الجهاز لا يدعم تحديد الموقع");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const data: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        // Try reverse geocoding for city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${data.latitude}&lon=${data.longitude}&format=json&accept-language=ar`
          );
          if (res.ok) {
            const json = await res.json();
            data.city = json.address?.city || json.address?.town || json.address?.village || json.address?.state;
          }
        } catch (error) {
          console.error("Error fetching city name from reverse geocoding:", error);
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        setLocation(data);
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("يرجى السماح بالوصول إلى الموقع");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("تعذر تحديد الموقع");
            break;
          case err.TIMEOUT:
            setError("انتهت مهلة تحديد الموقع");
            break;
          default:
            setError("حدث خطأ في تحديد الموقع");
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: CACHE_DURATION }
    );
  }, []);

  useEffect(() => {
    if (!location) {
      if (autoFetch) {
        fetchLocation();
        return;
      }

      // Check if permission was already granted previously
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((result) => {
            if (result.state === 'granted') {
              fetchLocation();
            } else {
              setLoading(false); // Done checking, don't spin indefinitely
            }
          })
          .catch(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }
  }, [autoFetch, location, fetchLocation]);

  return { location, loading, error, refresh: fetchLocation };
}

// Haversine formula - distance between two points on Earth
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Magnetic declination approximation using a bilinear interpolation grid
// Based on WMM2025 representative sample values (degrees East)
// Grid resolution: 30° lat x 30° lon, from lat -90..90, lon -180..180
export function getMagneticDeclination(lat: number, lon: number): number {
  // Sample points: [lat, lon, declination]
  // Values derived from WMM2025 (epoch 2025.0)
  const samples: [number, number, number][] = [
    // North America
    [70, -140, 28], [70, -100, -5], [70, -60, -30],
    [50, -130, 18], [50, -100, 5],  [50, -80, -10], [50, -60, -18],
    [30, -120, 12], [30, -100, 3],  [30, -80, -5],  [30, -60, -14],
    [15, -90, -1],  [15, -70, -8],
    // South America
    [0,  -80, -4],  [0,  -60, -16], [0,  -40, -20],
    [-30,-70,  1],  [-30,-50, -15], [-30,-40, -17],
    [-55,-70,  10], [-55,-50,  0],
    // Europe & Africa
    [70,  20, 14],  [70,  40,  18],
    [50, -10, -2],  [50,  10,  2],  [50,  30,  6],
    [30,  -5,  0],  [30,  20,  3],  [30,  40,  3],  [30,  55,  2],
    [15,  15,  2],  [15,  40,  2],
    [0,   15,  0],  [0,   35, -3],
    [-15,  15, -8], [-15,  35, -5],
    [-30,  20,-15], [-30,  30,-12],
    [-55,  20,-27],
    // Middle East & Central Asia
    [50,  60,  3],  [50,  90,  2],  [50, 120,  7],
    [30,  55,  2],  [30,  70, -1],  [30,  90,  0],  [30, 110,  0],
    [15,  45,  2],  [15,  60,  1],  [15,  80, -1],
    // East Asia & Oceania
    [50, 130, -8],  [50, 150,-10],
    [30, 120, -5],  [30, 140, -8],
    [15, 110, -1],  [15, 130, -3],
    [0,  110,  1],  [0,  130,  2],
    [-15, 130,  3], [-30, 115,  2], [-30, 150,  12],
    [-55, 150,  22],
    // Pacific
    [50, 170, -8],  [50, -170, 12],
    [30, 170, 4],   [30,-170, 10],
    [0,  170, 7],   [0, -170, 9],
  ];

  // Inverse-distance weighted interpolation (IDW, power=2)
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [sLat, sLon, decl] of samples) {
    const dLat = lat - sLat;
    // Handle longitude wrap-around
    let dLon = lon - sLon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dist2 = dLat * dLat + dLon * dLon;
    if (dist2 < 0.0001) return decl; // exactly on sample point
    const w = 1 / dist2;
    weightedSum += decl * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
