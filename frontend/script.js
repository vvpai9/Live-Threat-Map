const world = Globe()
  (document.getElementById('globe'))
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000')
  .pointAltitude(0.0)
  .pointRadius(0.6)
  .pointColor(p => p.color)
  .pointsData([]);

world.controls().autoRotate = true;
world.controls().autoRotateSpeed = 0.5;
world.pointLabel(() => '');

const colors = ['#ff3b3b','#05ed19','#00c8ff','#ffcc00','#ff66ff','#ff9900'];
const points = [];
const seenIPs = new Set(); // Track unique IPs
const tooltip = document.getElementById('tooltip');
const ipCounter = document.getElementById('ip-counter');
const backgroundMusic = document.getElementById('background-music');
let ipCount = 0;
let lockedPoint = null;
const rotationToggle = document.getElementById('rotation-toggle');
const toggleSlider = document.getElementById('toggle-slider');
let isAudioInitialized = false;

// Time window for counting threats (24 hours in milliseconds)
const TIME_WINDOW = 24 * 60 * 60 * 1000;

function tryPlayAudio() {
  if (!isAudioInitialized && !backgroundMusic.paused) return;
  const playPromise = backgroundMusic.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        isAudioInitialized = true;
        const status = document.getElementById('status');
        status.textContent = 'Streaming...';
      })
      .catch(error => {
        if (error.name === 'NotAllowedError') {
          console.log('Autoplay blocked. Waiting for user interaction to play audio.');
          const status = document.getElementById('status');
          status.textContent = 'Click anywhere to enable audio';
        } else {
          console.error('Audio playback error:', error);
        }
      });
  }
}

function pauseAudio() {
  if (!backgroundMusic.paused) {
    backgroundMusic.pause();
  }
}

rotationToggle.addEventListener('change', () => {
  const enabled = rotationToggle.checked;
  world.controls().autoRotate = enabled;
  const knob = toggleSlider.querySelector('span');
  if (enabled) {
    toggleSlider.style.background = '#0f0';
    knob.style.left = '2px';
    tryPlayAudio();
  } else {
    toggleSlider.style.background = '#555';
    knob.style.left = '22px';
    pauseAudio();
  }
});

// Enable audio on user interaction if not already initialized
document.addEventListener('click', () => {
  if (!isAudioInitialized && world.controls().autoRotate) {
    tryPlayAudio();
  }
}, { once: true });

// Initialize rotation state without triggering audio on load
rotationToggle.checked = true;
world.controls().autoRotate = true;
toggleSlider.style.background = '#0f0';
toggleSlider.querySelector('span').style.left = '2px';

world.onPointHover(point => {
  if (lockedPoint) return;
  showTooltip(point);
});

world.onPointClick(point => {
  lockedPoint = point;
  showTooltip(point);
});

function showTooltip(point) {
  if (!point) {
    if (!lockedPoint) tooltip.style.display = 'none';
    return;
  }
  tooltip.style.display = 'block';
  tooltip.innerHTML = `<b>${point.name}</b><br><i>${point.city}, ${point.country}</i>`;
}

document.addEventListener('click', ev => {
  if (!ev.target.closest('canvas')) {
    lockedPoint = null;
    tooltip.style.display = 'none';
  }
});

document.addEventListener('mousemove', ev => {
  if (!lockedPoint) {
    tooltip.style.top = `${ev.clientY + 12}px`;
    tooltip.style.left = `${ev.clientX + 12}px`;
  }
});

function addPoint(lat, lon, magnitude, label, city, country, ip) {
  if (seenIPs.has(ip)) return; // Skip duplicate IPs
  seenIPs.add(ip);
  const now = Date.now();
  const color = colors[Math.floor(Math.random() * colors.length)];
  points.push({
    lat,
    lng: lon,
    alt: 0.05 + Math.random() * 0.1,
    name: label || 'event',
    color,
    city: city || 'Unknown city',
    country: country || 'Unknown country',
    timestamp: now,
    ip
  });
  ipCount++;
  updatePointsAndCounter();
}

function updatePointsAndCounter() {
  const now = Date.now();
  // Remove points older than TIME_WINDOW
  const filteredPoints = points.filter(point => now - point.timestamp <= TIME_WINDOW);
  const removedCount = points.length - filteredPoints.length;
  points.length = 0;
  points.push(...filteredPoints);
  // Update seenIPs to match current points
  seenIPs.clear();
  points.forEach(point => seenIPs.add(point.ip));
  ipCount = points.length;
  world.pointsData(points);
  ipCounter.textContent = `Threats Identified (Last 24h): ${ipCount}`;
}

// Periodically clean up old points every 60 seconds
setInterval(updatePointsAndCounter, 60 * 1000);
document.getElementById('reset-counter').addEventListener('click', () => {
  points.length = 0;
  seenIPs.clear();
  ipCount = 0;
  world.pointsData([]);
  ipCounter.textContent = `Threats Identified (Last 24h): ${ipCount}`;
});

const status = document.getElementById('status');
const statusDot = document.getElementById('statusDot');
const es = new EventSource('http://127.0.0.1:8000/events');
es.onopen = () => {
  status.textContent = 'Streaming...';
  statusDot.style.background = '#05ed19';
};
es.onerror = () => {
  status.textContent = 'Disconnected (Retrying…)';
  statusDot.style.background = '#000';
};
es.onmessage = (msg) => {
  try {
    const ev = JSON.parse(msg.data);
    if (ev.lat && ev.lon) {
      addPoint(ev.lat, ev.lon, ev.metric, `${ev.kind.toUpperCase()} ${ev.score.toFixed(2)} ${ev.label||''}`, ev.city, ev.country, ev.ip);
    } else if (ev.country === "WW") {
      addPoint(0, 0, ev.metric, ev.label, null, null, ev.ip || `ww_${Date.now()}`);
    }
  } catch (e) {
    console.warn("Failed to parse SSE event", e);
  }
};