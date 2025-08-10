// Utility to classify distance of Turkish cities to Istanbul
// Uses Haversine formula with a lightweight city coordinate map

export type DistanceCategory = "çok yakın" | "yakın" | "orta" | "uzak" | "çok uzak";

const ISTANBUL = { lat: 41.0082, lon: 28.9784 };

// Minimal coordinate map of Turkish provinces (il). Add more as needed.
// Coordinates approximate city centers.
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "istanbul": { lat: 41.0082, lon: 28.9784 },
  "kocaeli": { lat: 40.8533, lon: 29.8815 },
  "sakarya": { lat: 40.7731, lon: 30.3948 },
  "bursa": { lat: 40.1950, lon: 29.0600 },
  "yalova": { lat: 40.6500, lon: 29.2667 },
  "tekirdağ": { lat: 40.9778, lon: 27.5153 },
  "edirne": { lat: 41.6772, lon: 26.5556 },
  "kırklareli": { lat: 41.7339, lon: 27.2253 },
  "çanakkale": { lat: 40.1450, lon: 26.4064 },
  "balıkesir": { lat: 39.6484, lon: 27.8826 },
  "bilecik": { lat: 40.1500, lon: 29.9833 },
  "düzce": { lat: 40.8389, lon: 31.1639 },
  "bolu": { lat: 40.7350, lon: 31.6119 },
  "eskişehir": { lat: 39.7767, lon: 30.5206 },
  "kütahya": { lat: 39.4167, lon: 29.9833 },
  "ankara": { lat: 39.9208, lon: 32.8541 },
  "izmir": { lat: 38.4189, lon: 27.1287 },
  "manisa": { lat: 38.6191, lon: 27.4289 },
  "aydın": { lat: 37.8450, lon: 27.8396 },
  "muğla": { lat: 37.2153, lon: 28.3636 },
  "denizli": { lat: 37.7765, lon: 29.0864 },
  "afyonkarahisar": { lat: 38.7567, lon: 30.5433 },
  "uşak": { lat: 38.6823, lon: 29.4082 },
  "burdur": { lat: 37.7167, lon: 30.2833 },
  "ısparta": { lat: 37.7648, lon: 30.5566 },
  "antalya": { lat: 36.8969, lon: 30.7133 },
  "konya": { lat: 37.8714, lon: 32.4847 },
  "karaman": { lat: 37.1811, lon: 33.2150 },
  "mersin": { lat: 36.8000, lon: 34.6333 },
  "adana": { lat: 37.0000, lon: 35.3213 },
  "hatay": { lat: 36.2028, lon: 36.1606 },
  "osmaniye": { lat: 37.0742, lon: 36.2475 },
  "kahramanmaraş": { lat: 37.5753, lon: 36.9228 },
  "kilis": { lat: 36.7167, lon: 37.1167 },
  "gaziantep": { lat: 37.0662, lon: 37.3833 },
  "şanlıurfa": { lat: 37.1674, lon: 38.7955 },
  "mardin": { lat: 37.3131, lon: 40.7436 },
  "diyarbakır": { lat: 37.9144, lon: 40.2306 },
  "batman": { lat: 37.8812, lon: 41.1351 },
  "siirt": { lat: 37.9333, lon: 41.9500 },
  "şırnak": { lat: 37.5219, lon: 42.4543 },
  "hakkari": { lat: 37.5744, lon: 43.7408 },
  "van": { lat: 38.4891, lon: 43.4089 },
  "bitlis": { lat: 38.4012, lon: 42.1078 },
  "muş": { lat: 38.7432, lon: 41.5067 },
  "ağrı": { lat: 39.7191, lon: 43.0503 },
  "iğdır": { lat: 39.9237, lon: 44.0436 },
  "kars": { lat: 40.6013, lon: 43.0975 },
  "ardahan": { lat: 41.1105, lon: 42.7022 },
  "erzurum": { lat: 39.9043, lon: 41.2679 },
  "erzincan": { lat: 39.7505, lon: 39.4926 },
  "bingöl": { lat: 38.8853, lon: 40.4983 },
  "tunceli": { lat: 39.1062, lon: 39.5484 },
  "elazığ": { lat: 38.6800, lon: 39.2200 },
  "malatya": { lat: 38.3552, lon: 38.3095 },
  "sivas": { lat: 39.7477, lon: 37.0179 },
  "yozgat": { lat: 39.8200, lon: 34.8044 },
  "kırşehir": { lat: 39.1458, lon: 34.1639 },
  "kırıkkale": { lat: 39.8468, lon: 33.5153 },
  "çorum": { lat: 40.5489, lon: 34.9533 },
  "amasya": { lat: 40.6524, lon: 35.8288 },
  "tokat": { lat: 40.3167, lon: 36.5500 },
  "trabzon": { lat: 41.0015, lon: 39.7178 },
  "rize": { lat: 41.0201, lon: 40.5234 },
  "artvin": { lat: 41.1833, lon: 41.8167 },
  "ordu": { lat: 40.9833, lon: 37.8833 },
  "giresun": { lat: 40.9128, lon: 38.3895 },
  "gümüşhane": { lat: 40.4600, lon: 39.4817 },
  "bayburt": { lat: 40.2552, lon: 40.2249 },
  "samsun": { lat: 41.2867, lon: 36.33 },
  "sinop": { lat: 42.0264, lon: 35.1550 },
  "kastamonu": { lat: 41.3887, lon: 33.7827 },
  "çankırı": { lat: 40.6013, lon: 33.6134 },
  "zonguldak": { lat: 41.4564, lon: 31.7987 },
  "karabük": { lat: 41.1964, lon: 32.6228 },
  "bartın": { lat: 41.6358, lon: 32.3375 },
  "diyarbakir": { lat: 37.9144, lon: 40.2306 },
};

function toKey(city: string) {
  return city
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    // Fix for Turkish dotted 'İ' -> 'i' (i + combining dot U+0307)
    .replace(/\u0307/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function normalizeCityForProvince(cityRaw: string | null | undefined): string | null {
  if (!cityRaw) return null;
  const rawKey = toKey(cityRaw);
  if (rawKey.includes("istanbul")) return "istanbul";
  const firstPart = cityRaw.split(/[\\/|,;:–-]/)[0]?.trim() || cityRaw;
  return toKey(firstPart);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceKmToIstanbul(cityRaw: string | null | undefined): number | null {
  if (!cityRaw) return null;
  const rawKey = toKey(cityRaw);
  // If text clearly contains Istanbul anywhere (e.g. "İstanbul / Sarıyer"), treat as 0 km
  if (rawKey.includes("istanbul")) return 0;

  // Try first segment before common separators to extract the province name
  const firstPart = cityRaw.split(/[\\/|,;:–-]/)[0]?.trim() || cityRaw;
  const key = toKey(firstPart);
  const coords = CITY_COORDS[key];
  if (!coords) return null;
  return Math.round(haversine(coords.lat, coords.lon, ISTANBUL.lat, ISTANBUL.lon));
}

export function classifyDistanceToIstanbul(cityRaw: string | null | undefined): DistanceCategory | "" {
  const d = getDistanceKmToIstanbul(cityRaw);
  if (d === null) return "";
  if (d < 50) return "çok yakın";
  if (d < 150) return "yakın";
  if (d < 400) return "orta";
  if (d < 800) return "uzak";
  return "çok uzak";
}
