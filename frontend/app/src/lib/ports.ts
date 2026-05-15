interface Port {
  name: string;
  lat: number;
  lon: number;
}

// Major European ports keyed by UN/LOCODE and common AIS destination strings.
// AIS dest field is free-text; vessels may use the LOCODE, city name, or abbreviations.
const PORT_DB: Record<string, Port> = {
  // Netherlands
  "NLRTM": { name: "Rotterdam",    lat: 51.9225, lon:  4.4792 },
  "NLAMS": { name: "Amsterdam",    lat: 52.3676, lon:  4.9041 },
  "NLFLU": { name: "Flushing",     lat: 51.4426, lon:  3.5960 },
  // Belgium
  "BEANR": { name: "Antwerp",      lat: 51.2194, lon:  4.4025 },
  "BEZEE": { name: "Zeebrugge",    lat: 51.3320, lon:  3.1977 },
  // Germany
  "DEHAM": { name: "Hamburg",      lat: 53.5753, lon:  9.9396 },
  "DEBRE": { name: "Bremen",       lat: 53.0793, lon:  8.8017 },
  "DEWIL": { name: "Wilhelmshaven",lat: 53.5135, lon:  8.1059 },
  "DEROS": { name: "Rostock",      lat: 54.0887, lon: 12.1407 },
  // UK
  "GBFXT": { name: "Felixstowe",   lat: 51.9539, lon:  1.3519 },
  "GBSOU": { name: "Southampton",  lat: 50.9097, lon: -1.4044 },
  "GBLIV": { name: "Liverpool",    lat: 53.4084, lon: -2.9916 },
  "GBIMM": { name: "Immingham",    lat: 53.6274, lon: -0.1873 },
  "GBLGP": { name: "London Gateway",lat:51.5074, lon:  0.4966 },
  "GBTIL": { name: "Tilbury",      lat: 51.4613, lon:  0.3567 },
  // France
  "FRLEH": { name: "Le Havre",     lat: 49.4938, lon:  0.1079 },
  "FRMRS": { name: "Marseille",    lat: 43.2965, lon:  5.3698 },
  "FRDKK": { name: "Dunkirk",      lat: 51.0343, lon:  2.3771 },
  // Spain
  "ESVLC": { name: "Valencia",     lat: 39.4699, lon: -0.3763 },
  "ESALG": { name: "Algeciras",    lat: 36.1408, lon: -5.4536 },
  "ESBCN": { name: "Barcelona",    lat: 41.3851, lon:  2.1734 },
  "ESBIO": { name: "Bilbao",       lat: 43.3623, lon: -3.0004 },
  // Italy
  "ITGOA": { name: "Genoa",        lat: 44.4056, lon:  8.9463 },
  "ITVCE": { name: "Venice",       lat: 45.4408, lon: 12.3155 },
  "ITLIV": { name: "Livorno",      lat: 43.5518, lon: 10.3122 },
  "ITCVV": { name: "Civitavecchia",lat: 42.0908, lon: 11.7985 },
  "ITTRS": { name: "Trieste",      lat: 45.6495, lon: 13.7768 },
  "ITAOI": { name: "Ancona",       lat: 43.6158, lon: 13.5189 },
  "ITBRI": { name: "Brindisi",     lat: 40.6326, lon: 17.9358 },
  // Greece
  "GRPIR": { name: "Piraeus",      lat: 37.9422, lon: 23.6462 },
  "GRHER": { name: "Heraklion",    lat: 35.3387, lon: 25.1442 },
  "GRTHS": { name: "Thessaloniki", lat: 40.6401, lon: 22.9444 },
  // Sweden
  "SEGOT": { name: "Gothenburg",   lat: 57.7089, lon: 11.9746 },
  "SESTO": { name: "Stockholm",    lat: 59.3293, lon: 18.0686 },
  // Denmark
  "DKAAR": { name: "Aarhus",       lat: 56.1629, lon: 10.2039 },
  "DKCPH": { name: "Copenhagen",   lat: 55.6761, lon: 12.5683 },
  // Norway
  "NOBGO": { name: "Bergen",       lat: 60.3913, lon:  5.3221 },
  "NOOSL": { name: "Oslo",         lat: 59.9139, lon: 10.7522 },
  // Finland
  "FIHEL": { name: "Helsinki",     lat: 60.1699, lon: 24.9384 },
  // Poland
  "PLGDY": { name: "Gdynia",       lat: 54.5189, lon: 18.5305 },
  "PLGDA": { name: "Gdansk",       lat: 54.3520, lon: 18.6466 },
  // Russia
  "RULED": { name: "St. Petersburg",lat:59.9343, lon: 30.3351 },
  // Turkey
  "TRIST": { name: "Istanbul",     lat: 41.0082, lon: 28.9784 },
  "TRIZM": { name: "Izmir",        lat: 38.4237, lon: 27.1428 },
  // Portugal
  "PTLIS": { name: "Lisbon",       lat: 38.7169, lon: -9.1395 },
  "PTLEI": { name: "Leixões",      lat: 41.1857, lon: -8.7006 },
  // Morocco (Gibraltar Strait traffic)
  "MATAN": { name: "Tangier Med",  lat: 35.8846, lon: -5.5038 },
};

// Aliases: free-text AIS dest strings that vessels actually use
const ALIASES: Record<string, string> = {
  "ROTTERDAM":      "NLRTM",
  "AMSTERDAM":      "NLAMS",
  "ANTWERP":        "BEANR",
  "HAMBURG":        "DEHAM",
  "BREMEN":         "DEBRE",
  "FELIXSTOWE":     "GBFXT",
  "SOUTHAMPTON":    "GBSOU",
  "LIVERPOOL":      "GBLIV",
  "LE HAVRE":       "FRLEH",
  "LEHAVRE":        "FRLEH",
  "MARSEILLE":      "FRMRS",
  "MARSEILLES":     "FRMRS",
  "VALENCIA":       "ESVLC",
  "ALGECIRAS":      "ESALG",
  "BARCELONA":      "ESBCN",
  "BILBAO":         "ESBIO",
  "GENOA":          "ITGOA",
  "GENOVA":         "ITGOA",
  "VENICE":         "ITVCE",
  "VENEZIA":        "ITVCE",
  "LIVORNO":        "ITLIV",
  "TRIESTE":        "ITTRS",
  "PIRAEUS":        "GRPIR",
  "PIREAUS":        "GRPIR",
  "GOTHENBURG":     "SEGOT",
  "GOTEBORG":       "SEGOT",
  "STOCKHOLM":      "SESTO",
  "AARHUS":         "DKAAR",
  "COPENHAGEN":     "DKAAR",
  "BERGEN":         "NOBGO",
  "OSLO":           "NOOSL",
  "HELSINKI":       "FIHEL",
  "GDYNIA":         "PLGDY",
  "GDANSK":         "PLGDA",
  "ISTANBUL":       "TRIST",
  "LISBON":         "PTLIS",
  "LISBOA":         "PTLIS",
  "ZEEBRUGGE":      "BEZEE",
  "DUNKIRK":        "FRDKK",
  "DUNKERQUE":      "FRDKK",
  "WILHELMSHAVEN":  "DEWIL",
  "ROSTOCK":        "DEROST",
};

export function resolvePort(dest: string | undefined): Port | null {
  if (!dest) return null;
  const key = dest.trim().toUpperCase();
  const locode = PORT_DB[key] ? key : ALIASES[key];
  return locode ? PORT_DB[locode] ?? null : null;
}
