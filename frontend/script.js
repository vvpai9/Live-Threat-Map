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
const tooltip = document.getElementById('tooltip');
const ipCounter = document.getElementById('ip-counter');
let ipCount = 0;
let lockedPoint = null;
const rotationToggle = document.getElementById('rotation-toggle');
const toggleSlider = document.getElementById('toggle-slider');

rotationToggle.addEventListener('change', () => {
  const enabled = rotationToggle.checked;
  world.controls().autoRotate = enabled;
  // Animate slider knob
  const knob = toggleSlider.querySelector('span');
  if (enabled) {
    toggleSlider.style.background = '#0f0';
    knob.style.left = '2px';
  } else {
    toggleSlider.style.background = '#555';
    knob.style.left = '22px';
  }
});

// Initialize state on load
rotationToggle.dispatchEvent(new Event('change'));

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

function addPoint(lat, lon, magnitude, label, city, country) {
  const color = colors[Math.floor(Math.random() * colors.length)];
  points.push({
    lat, lng: lon, alt: 0.05 + Math.random() * 0.1,
    name: label || 'event', color,
    city: city || 'Unknown city',
    country: country || 'Unknown country'
  });
  world.pointsData(points.slice(-2000));
  ipCount++;
  ipCounter.textContent = `Threats Identified: ${ipCount}`;
}

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
      addPoint(ev.lat, ev.lon, ev.metric, `${ev.kind.toUpperCase()} ${ev.score.toFixed(2)} ${ev.label||''}`, ev.city, ev.country);
    } else if (ev.country === "WW") {
      addPoint(0, 0, ev.metric, ev.label);
    }
  } catch (e) {
    console.warn("Failed to parse SSE event", e);
  }
};