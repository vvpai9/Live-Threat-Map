# 🌍 Live Threat Map

An interactive real-time cyber threat visualization built with **Python (FastAPI + Uvicorn)** on the backend and **Globe.GL (Three.js)** on the frontend.  
<br/> Incoming security events (from your server or any source) are displayed on a 3D globe with live streaming updates using **Server-Sent Events (SSE)**.

<img width="1907" height="902" alt="image" src="https://github.com/user-attachments/assets/93f9f628-8ee2-4e41-83c9-71450da03c45" />


---

## Features

- **FastAPI + Uvicorn backend** serving real-time event streams on port **8000**.  
- **Frontend globe interface** running on port **5500**, using [Globe.GL](https://github.com/vasturiano/globe.gl).  
- **Live threat visualization** with color-coded points and tooltips.  
- **Auto-rotate toggle** to control globe rotation dynamically.  
- **Lightweight setup** using virtual environments for Python dependencies.

---

## 1. Clone the repository

```bash/PowerShell
git clone https://github.com/vvpai9/live-threat-map.git
cd live-threat-map
```

## 2. Set up a virtual environment and install dependencies
Download ```GeoLite2-City.mmdb``` file from [GeoLite](https://github.com/P3TERX/GeoLite.mmdb) and place the file in the ```backend``` folder

<br/> Linux (bash):
```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Windows PowerShell:
```
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Run the backend (FastAPI + Uvicorn on port 8000)
```
uvicorn app:app --reload --port 8000
```

## 4. Run the frontend (Globe interface on port 5500)
The frontend is a static HTML/JS page. You can serve it using Python’s built-in HTTP server. 
<br/> In a new terminal instance, run:
```
cd ..
cd frontend
python -m http.server 5500
```
Then open ```http://127.0.0.1:5500``` in your browser

## 5. Using the Globe and Its Features

- **Streaming status indicator**: The HUD at the top left shows connection status (green = streaming, black = disconnected).

- **Threat points**: When new events are received from the backend, they appear as colored points on the globe.

- **Tooltips**: Hover or click a point to lock its information (city, country, label).

- **Auto-rotate toggle**: Use the switch at the top right to enable or disable globe rotation in real time.

- **Dynamic updates**: Data points automatically refresh without reloading the page.

## 6. Notes

- By default, the frontend connects to ```http://127.0.0.1:8000/events``` using Server-Sent Events (SSE).

- If you host this on a remote server, make sure to update URLs in ```index.html```.

- The backend functionalities of this project may further be increased by integrating ```geo.py```, ```ingest.py``` and ```scorer.py``` with the main workflow 

## 7. Stopping the servers

Press ```CTRL + C``` in both terminals (backend and frontend) to stop.
<br/> Deactivate the virtual environment when done:
```
deactivate
```
