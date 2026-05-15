export interface ScanArea {
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export const EUScanAreas: ScanArea[] = [
  { name: "Celtic Sea",            minLat: 49.0, maxLat: 51.5, minLon: -11.0, maxLon:  -6.0 },
  { name: "Bay of Biscay",         minLat: 44.5, maxLat: 47.5, minLon:  -8.0, maxLon:  -3.5 },
  { name: "English Channel West",  minLat: 49.5, maxLat: 51.0, minLon:  -4.5, maxLon:  -1.0 },
  { name: "English Channel East",  minLat: 50.5, maxLat: 51.5, minLon:   1.5, maxLon:   3.5 },
  { name: "Southern North Sea",    minLat: 52.5, maxLat: 54.5, minLon:   3.5, maxLon:   7.0 },
  { name: "Central North Sea",     minLat: 56.0, maxLat: 58.5, minLon:   2.0, maxLon:   6.0 },
  { name: "Norwegian North Sea",   minLat: 58.5, maxLat: 62.0, minLon:   2.0, maxLon:   5.5 },
  { name: "Kattegat",              minLat: 56.5, maxLat: 58.5, minLon:  10.0, maxLon:  13.0 },
  { name: "Baltic Sea",            minLat: 55.0, maxLat: 57.5, minLon:  14.0, maxLon:  20.0 },
  { name: "Strait of Gibraltar",   minLat: 35.5, maxLat: 36.5, minLon:  -6.0, maxLon:  -1.5 },
  { name: "Western Mediterranean", minLat: 38.5, maxLat: 41.5, minLon:   3.0, maxLon:   8.0 },
  { name: "Ligurian Sea",          minLat: 42.5, maxLat: 44.0, minLon:   7.5, maxLon:  10.0 },
  { name: "Tyrrhenian Sea",        minLat: 39.0, maxLat: 41.5, minLon:  11.0, maxLon:  14.5 },
  { name: "Ionian Sea",            minLat: 36.5, maxLat: 38.5, minLon:  16.0, maxLon:  20.0 },
  { name: "Adriatic Open",         minLat: 42.0, maxLat: 44.5, minLon:  14.5, maxLon:  16.5 },
  { name: "Aegean Sea",            minLat: 37.0, maxLat: 39.5, minLon:  24.0, maxLon:  27.0 },
];
