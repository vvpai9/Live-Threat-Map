import requests
import time
import json
import geoip2.database
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
geoip_reader = geoip2.database.Reader("GeoLite2-City.mmdb")

THREATFOX_URL = "https://threatfox-api.abuse.ch/api/v1/"
AUTH_KEY = "05bbc6f902edf45b13a35217e2b599182d065f62f59afbac"  # Replace with your real key

def fetch_threatfox_data():
    headers = {
        "Content-Type": "application/json",
        "Auth-Key": AUTH_KEY
    }
    payload = {"query": "get_iocs", "days": 1}
    try:
        res = requests.post(THREATFOX_URL, json=payload, headers=headers, timeout=10)
        res.raise_for_status()
        data = res.json().get("data", [])
        seen_ips = set()  # Track unique IPs
        results = []
        for entry in data:
            if entry.get("ioc_type") == "ip:port":
                ip = entry["ioc"].split(':')[0]
                if ip not in seen_ips:
                    seen_ips.add(ip)
                    confidence = entry.get("confidence_level", 50)
                    results.append({
                        "ip": ip,
                        "confidence": confidence
                    })
        print(f"Fetched {len(results)} unique suspicious IPs")
        return results
    except Exception as e:
        print(f"Failed to fetch ThreatFox data: {e}")
        return []

def ip_to_location(ip):
    try:
        r = geoip_reader.city(ip)
        city = r.city.name if r.city else "Unknown"
        country = r.country.name if r.country else "Unknown"
        return r.location.latitude, r.location.longitude, city, country
    except:
        return None

suspicious_ips = fetch_threatfox_data()
last_refresh = time.time()

@app.get("/events")
def events():
    def event_stream():
        global suspicious_ips, last_refresh
        print("Starting event stream...")
        processed_ips = set()  # Track IPs sent in this stream cycle
        while True:
            if time.time() - last_refresh > 60:
                print("Refreshing ThreatFox data...")
                suspicious_ips = fetch_threatfox_data()
                processed_ips.clear()  # Reset processed IPs on refresh
                last_refresh = time.time()
            
            if not suspicious_ips:
                print("No suspicious IPs available")
                yield "data: {}\n\n"
                time.sleep(5)
                continue

            for entry in suspicious_ips[:200]:
                ip = entry["ip"]
                if ip in processed_ips:
                    continue  # Skip already processed IPs in this cycle
                processed_ips.add(ip)
                confidence = entry["confidence"]
                loc = ip_to_location(ip)
                if loc:
                    lat, lon, city, country = loc
                    data = json.dumps({
                        'ts': time.time(),
                        'lat': lat,
                        'lon': lon,
                        'city': city,
                        'country': country,
                        'metric': int(confidence * 100),
                        'kind': 'threat',
                        'score': confidence,
                        'label': f"IP: {ip} \n(Risk: {confidence}%)",
                        'ip': ip  # Include IP for frontend deduplication
                    })
                    yield f"data: {data}\n\n"
                    time.sleep(0.5)
                else:
                    print(f"No location for IP: {ip}")
            time.sleep(5)
    return StreamingResponse(event_stream(), media_type="text/event-stream")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
)