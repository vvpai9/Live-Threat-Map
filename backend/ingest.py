import os, time
import httpx
from typing import List, Dict, Any

RADAR_BASE = "https://api.cloudflare.com/client/v4/radar"

# Minimal queries: use Radar Data Explorer patterns (HTTP request time series / attacks by location)
# Docs & examples: see Cloudflare Radar docs. License: CC BY-NC 4.0. 
# We'll use a safe, anonymous endpoint that doesn't require tokens for public aggregates.

async def pull_cloudflare_trends() -> List[Dict[str, Any]]:
    # Example: pull “Application layer attacks” time series and create spikes
    # (This is an illustrative “shaping” of the Radar JSON into map events.)
    url = "https://radar.cloudflare.com/api/http/attacks/series?location=WW&interval=15m&agg=time"
    # Fallback: different endpoints exist; adjust per docs/Data Explorer "Request URL".
    # (In production, make endpoints configurable.)
    out = []
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        if r.status_code != 200:
            return out
        js = r.json()
        # Try to navigate common shape: result.timestamps + result.attacks.ddos[]
        result = js.get("result") or js
        timestamps = (result.get("attacks") or {}).get("timestamps") \
                     or result.get("timestamps") or []
        ddos_series = (result.get("attacks") or {}).get("ddos") \
                      or result.get("series") or []
        # simple spike detector: point > moving avg * 1.5
        vals = [float(x) for x in ddos_series[-24:]] if ddos_series else []
        if not timestamps or not vals:
            return out
        avg = (sum(vals)/len(vals)) if vals else 0.0
        for t, v in zip(timestamps[-24:], vals):
            if avg and v > 1.5 * avg:
                out.append({
                    "ts": time.time(),
                    "country": "WW",
                    "lat": 0.0, "lon": 0.0,
                    "dst_country": None,
                    "metric": v,
                    "label": f"Radar spike: {v:.2f}"
                })
    return out

ABUSE_KEY = os.getenv("ABUSEIPDB_KEY")
ABUSE_ENDPOINT = "https://api.abuseipdb.com/api/v2/blacklist"  # an example public list

async def pull_abuseipdb_chunk():
    if not ABUSE_KEY:
        return []
    headers = {"Key": ABUSE_KEY, "Accept": "application/json"}
    params = {"confidenceMinimum": "75"}  # tune this
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(ABUSE_ENDPOINT, headers=headers, params=params)
            if r.status_code != 200:
                return []
            data = r.json().get("data", [])
            # return a small slice each poll to respect rate limits
            return [rec["ipAddress"] for rec in data[:25] if "ipAddress" in rec]
    except Exception:
        return []
