# AIS Hub API — Analysis & Reference
> For use in dark vessel detection pipeline
 
---
 
## Overview
 
AIS Hub (`aishub.net`) is a cooperative AIS data-sharing network built on contributions from over 1,200 volunteer ground stations worldwide. Members who share their own AIS feed are granted access to the aggregated global dataset via a REST webservice. The API returns **only vessels actively broadcasting** — making it inherently a "behaving ships" feed. The absence of a vessel from this data is itself a signal.
 
**Base URL:**
```
https://data.aishub.net/ws.php
```
 
**Access model:** You must register and share your own AIS feed to receive an API key (username). There is no paid tier — it is contribution-gated.
 
---
 
## Rate Limiting
 
> ⚠️ **Hard limit: once per minute.** The API returns nothing (empty response, no error) if called more frequently. Design your polling loop accordingly.
 
---
 
## Endpoints
 
### 1. Vessel Data API
 
```
GET https://data.aishub.net/ws.php
```
 
Returns real-time positions and metadata for broadcasting vessels.
 
#### Parameters
 
| Parameter | Key | Default | Description |
|-----------|-----|---------|-------------|
| Username  | `username` | — | Your AIS Hub username (API key) |
| Format    | `format` | `0` | `0` = raw AIS encoding · `1` = human-readable |
| Output    | `output` | `xml` | `xml` · `json` · `csv` |
| Compress  | `compress` | `0` | `0` = none · `1` = ZIP · `2` = GZIP · `3` = BZIP2 |
| Lat min   | `latmin` | `-90` | South bounding latitude |
| Lat max   | `latmax` | `+90` | North bounding latitude |
| Lon min   | `lonmin` | `-180` | West bounding longitude |
| Lon max   | `lonmax` | `+180` | East bounding longitude |
| MMSI      | `mmsi` | — | Single MMSI or comma-separated list |
| IMO       | `imo` | — | Single IMO or comma-separated list |
| Interval  | `interval` | — | Max age of returned positions (minutes) |
 
#### Example Requests
 
**All vessels globally, JSON, GZIP:**
```
https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json&compress=2
```
 
**Bounding box (e.g., Gulf of Guinea — high dark vessel activity):**
```
https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json&compress=2&latmin=-5&latmax=10&lonmin=0&lonmax=15
```
 
**Specific vessel by MMSI:**
```
https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json&compress=2&mmsi=123456789
```
 
**Multiple vessels by MMSI + IMO:**
```
https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json&compress=2&mmsi=123456789,223456789&imo=1234567,1234568
```
 
**Only recent positions (last 10 minutes):**
```
https://data.aishub.net/ws.php?username=USERNAME&format=1&output=json&compress=2&interval=10
```
 
---
 
### 2. Stations API
 
```
GET https://data.aishub.net/stations.php
```
 
Returns metadata about contributing ground stations — useful for understanding coverage gaps (dark zones where no receivers exist).
 
#### Parameters
 
| Parameter | Key | Default | Description |
|-----------|-----|---------|-------------|
| Username  | `username` | — | Your AIS Hub username |
| Output    | `output` | `xml` | `xml` · `json` · `csv` |
| Compress  | `compress` | `0` | `0` = none · `1` = ZIP · `2` = GZIP · `3` = BZIP2 |
| Station ID | `id` | — | Filter to a single station |
 
#### Example Request
 
```
https://data.aishub.net/stations.php?username=USERNAME&output=json
```
 
#### Station Response Fields
 
| Field | Description |
|-------|-------------|
| `ID` | Unique station identifier |
| `LASTUPDATE` | Timestamp of last update (UTC) |
| `COUNTRY` | Country where station is located |
| `LOCATION` | Station location name |
| `SHIPS` | Total ships in coverage area |
| `DISTINCT` | Unique ships seen |
 
---
 
## Response Schema — Vessel Data
 
### Human-Readable Format (`format=1`) — Recommended
 
**JSON response structure:**
```json
[
  { "ERROR": false, "USERNAME": "USERNAME", "FORMAT": "HUMAN", "RECORDS": 2 },
  [
    {
      "MMSI": 374651000,
      "TIME": "2021-07-09 12:09:25 GMT",
      "LONGITUDE": -128.26693,
      "LATITUDE": 33.89075,
      "COG": 122.6,
      "SOG": 14.7,
      "HEADING": 119,
      "ROT": -8,
      "NAVSTAT": 0,
      "IMO": 9853864,
      "NAME": "FUTURE DIAMOND",
      "CALLSIGN": "3ETX9",
      "TYPE": 80,
      "A": 188,
      "B": 42,
      "C": 11,
      "D": 21,
      "DRAUGHT": 8.0,
      "DEST": "PA BLB",
      "ETA": "07-18 22:30"
    }
  ]
]
```
 
> Note the two-element array structure: index `[0]` is the metadata envelope, index `[1]` is the vessel array.
 
### Field Reference
 
| Field | Type | Description | Dark Vessel Relevance |
|-------|------|-------------|----------------------|
| `MMSI` | int | Maritime Mobile Service Identity (9-digit unique ID) | Core identifier; spoofed or invalid MMSIs are a red flag |
| `TIME` | string/int | UTC timestamp of last position report | Stale timestamps may indicate transponder manipulation |
| `LONGITUDE` | float | Degrees (human format) | Position |
| `LATITUDE` | float | Degrees (human format) | Position |
| `COG` | float | Course Over Ground (degrees). `360.0` = not available | Inconsistent COG vs heading suggests spoofing |
| `SOG` | float | Speed Over Ground (knots). `102.4` = not available | Stationary vessel with no port/anchor status = suspicious |
| `HEADING` | int | True heading (degrees). `511` = not available | Large delta between heading and COG suggests drift or spoofing |
| `ROT` | int | Rate of Turn | Maneuvers inconsistent with declared nav status |
| `NAVSTAT` | int | Navigational Status (0–15, see below) | Mismatched status (e.g., "moored" but moving) |
| `IMO` | int | IMO number (`0` = not set / not applicable) | Missing IMO on a large vessel is anomalous |
| `NAME` | string | Vessel name (max 20 chars) | Generic or blank names are a signal |
| `CALLSIGN` | string | Radio callsign | Should be cross-referenceable with flag state records |
| `TYPE` | int | Vessel type code (see below) | Tankers/cargo with missing identifiers are higher risk |
| `A/B/C/D` | int | Dimensions: Bow / Stern / Port / Starboard (meters) | Cross-check against known vessel specs |
| `DRAUGHT` | float | Current draught (meters) | Loaded draught vs declared destination inconsistency |
| `DEST` | string | Declared destination | Cross-check against actual heading/trajectory |
| `ETA` | string | Estimated time of arrival (UTC) | Implausible ETAs relative to position and SOG |
 
---
 
## Key Code Tables
 
### NAVSTAT — Navigational Status
 
| Code | Meaning |
|------|---------|
| 0 | Under way using engine |
| 1 | At anchor |
| 2 | Not under command |
| 3 | Restricted manoeuvrability |
| 4 | Constrained by draught |
| 5 | Moored |
| 6 | Aground |
| 7 | Engaged in fishing |
| 8 | Under way sailing |
| 15 | Not defined / default |
 
> **Detection signal:** A vessel reporting `NAVSTAT=5` (moored) but with `SOG > 0` is a strong anomaly indicator.
 
### TYPE — Vessel Type (selected)
 
| Code | Meaning |
|------|---------|
| 30 | Fishing |
| 37 | Pleasure craft |
| 52 | Tug |
| 60–69 | Passenger ships |
| 70–79 | Cargo ships |
| 80–89 | Tankers |
| 90–99 | Other |
 
---
 
## Limitations for Dark Vessel Detection
 
Understanding what the API **cannot** tell you is as important as what it can.
 
**By design, this API only returns broadcasting vessels.** It cannot return vessels that have switched off their transponder — that is the definition of a dark vessel. AIS Hub is therefore most useful as a **baseline of legitimate traffic**, against which you detect anomalies or absences.
 
Specific limitations:
 
- **No historical track data.** The API is a snapshot of current positions. You must poll repeatedly and store your own time-series database to reconstruct vessel paths.
- **No satellite AIS (S-AIS).** AIS Hub is a terrestrial receiver network. Coverage is limited to areas within range of ground stations (~40–60 nautical miles from coast). Open ocean is a blind spot unless you supplement with S-AIS providers (e.g., Spire, exactEarth).
- **Coverage gaps are unquantified.** An absence of vessels in a region may mean no ships are there, or simply that no AIS station covers that area. Cross-reference with the Stations API to assess coverage density.
- **Data is contributor-quality.** AIS is self-reported — vessels can transmit false names, incorrect coordinates (GPS spoofing), or no data at all. The feed reflects what is broadcast, not necessarily ground truth.
- **One request per minute max.** At maximum poll rate, you get 1,440 global snapshots per day. Fast-moving vessels will have positional gaps between samples.
- **No flag/registry lookup.** The API returns MMSI and IMO but not the flag state or owner. MMSI's first 3 digits are the MID (Maritime Identification Digits) country code — you'll need a separate lookup table.
 
---
 
## Signals Detectable via AIS Hub
 
Despite the limitations, the feed supports several dark vessel detection heuristics:
 
| Heuristic | Fields Used | Anomaly |
|-----------|-------------|---------|
| AIS gap analysis | `TIME` + position across polls | Vessel disappears from feed mid-voyage |
| Speed-status mismatch | `SOG` + `NAVSTAT` | Moving while claiming moored/anchored |
| Heading-course divergence | `COG` + `HEADING` | Large consistent delta (> ~30°) |
| Invalid MMSI | `MMSI` | Not 9 digits, all zeros, MID doesn't match flag |
| Missing identity | `IMO`, `NAME`, `CALLSIGN` | Blank or placeholder values on commercial vessel |
| Implausible position jump | `LATITUDE/LONGITUDE` across polls | Teleportation (> max_SOG distance in interval) |
| Destination-trajectory mismatch | `DEST` + `COG` + position | Heading away from declared port |
| Rendezvous detection | Position across multiple vessels | Two vessels meeting in open ocean, neither declaring cargo transfer |
 
---
 
## Quick Start — Python Polling Example
 
```python
import requests
import time
import json
 
API_URL = "https://data.aishub.net/ws.php"
USERNAME = "YOUR_USERNAME"
 
def fetch_vessels(latmin=None, latmax=None, lonmin=None, lonmax=None, interval=None):
    params = {
        "username": USERNAME,
        "format": "1",        # human-readable
        "output": "json",
        "compress": "0",
    }
    if latmin is not None: params["latmin"] = latmin
    if latmax is not None: params["latmax"] = latmax
    if lonmin is not None: params["lonmin"] = lonmin
    if lonmax is not None: params["lonmax"] = lonmax
    if interval is not None: params["interval"] = interval
 
    response = requests.get(API_URL, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
 
    # data[0] = envelope metadata, data[1] = vessel list
    if data[0].get("ERROR"):
        raise ValueError(f"API error for user {data[0].get('USERNAME')}")
 
    return data[1]  # list of vessel dicts
 
def poll_loop(area: dict, poll_interval_seconds: int = 60):
    """
    Poll AIS Hub once per minute for a bounding box.
    area = {"latmin": x, "latmax": x, "lonmin": x, "lonmax": x}
    """
    while True:
        vessels = fetch_vessels(**area)
        timestamp = time.time()
        for v in vessels:
            # Store or process each vessel record
            v["_poll_time"] = timestamp
            # e.g., write to database, run anomaly checks, etc.
        print(f"[{timestamp}] {len(vessels)} vessels received")
        time.sleep(poll_interval_seconds)
 
if __name__ == "__main__":
    gulf_of_guinea = {"latmin": -5, "latmax": 10, "lonmin": 0, "lonmax": 15}
    poll_loop(gulf_of_guinea)
```
 
---
 
## Recommended Supplementary Data Sources
 
AIS Hub alone is insufficient for a complete dark vessel system. Pair it with:
 
| Source | What it adds |
|--------|-------------|
| **Satellite AIS** (Spire, exactEarth, ORBCOMM) | Coverage in open ocean / out of terrestrial range |
| **SAR imagery** (Sentinel-1, Capella, ICEYE) | Detect physical vessel presence regardless of AIS |
| **IMO/MMSI registry** (ITU, IHS Fairplay) | Validate identity fields against official records |
| **OFAC/UN sanctions lists** | Flag vessels associated with sanctioned entities |
| **Port state control records** | Historical compliance and detention data |
| **OpenSanctions / C4ADS datasets** | Ownership and beneficial control linkages |
 
---
