/* script.js */
const statusBadge = document.getElementById('status-badge');
const overlay = document.getElementById('offline-overlay');
const serverStatusEl = document.getElementById('server-status');
const serverUptimeEl = document.getElementById('server-uptime');
const streamAppEl = document.getElementById('stream-app');
const streamKeyEl = document.getElementById('stream-key');
const streamUptimeEl = document.getElementById('stream-uptime');
const streamUrlEl = document.getElementById('stream-url');
const refreshBtn = document.getElementById('refresh-btn');
const videoElement = document.getElementById('videoElement');

let flvPlayer = null;
let currentStreamPath = null;
let isPlaying = false;

// Host details
const HOST = window.location.hostname || 'localhost';
const HTTP_FLV_PORT = 8000;
const API_PORT = window.location.port || 3000;

function formatUptime(seconds) {
    if (seconds === '-' || isNaN(seconds)) return '-';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const hm = m % 60;
    return `${h}h ${hm}m`;
}

async function fetchStatus() {
    try {
        const response = await fetch(`http://${HOST}:${API_PORT}/status`);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();

        serverStatusEl.textContent = data.status;
        serverStatusEl.style.color = '#2ed573';
        serverUptimeEl.textContent = formatUptime(data.uptime);

        if (data.hasActiveStreams && data.streams.length > 0) {
            const stream = data.streams[0]; // Play the first stream for simplicity
            handleStreamOnline(stream);
        } else {
            handleStreamOffline();
        }
    } catch (err) {
        console.error('Error fetching status:', err);
        serverStatusEl.textContent = 'Disconnected';
        serverStatusEl.style.color = '#ff4757';
        serverUptimeEl.textContent = '-';
        handleStreamOffline();
    }
}

function handleStreamOnline(stream) {
    statusBadge.textContent = 'Online';
    statusBadge.className = 'badge badge-online';

    // NMS exposes HTTP FLV stream at http://host:8000/app/stream.flv
    // Using the parsed path, it usually looks like "/live/stream_key"
    const flvUrl = `http://${HOST}:${HTTP_FLV_PORT}${stream.path}.flv`;

    streamAppEl.textContent = stream.app;
    streamKeyEl.textContent = stream.key;
    streamUptimeEl.textContent = formatUptime(stream.uptimeSeconds);
    streamUrlEl.textContent = flvUrl;
    streamUrlEl.href = flvUrl;

    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';

    // Avoid reconnecting if already playing the same stream
    if (!isPlaying || currentStreamPath !== stream.path) {
        initPlayer(flvUrl);
        currentStreamPath = stream.path;
        isPlaying = true;
    }
}

function handleStreamOffline() {
    statusBadge.textContent = 'Offline';
    statusBadge.className = 'badge badge-offline';

    streamAppEl.textContent = '-';
    streamKeyEl.textContent = '-';
    streamUptimeEl.textContent = '-';
    streamUrlEl.textContent = '-';
    streamUrlEl.removeAttribute('href');

    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    destroyPlayer();
    isPlaying = false;
    currentStreamPath = null;
}

function initPlayer(url) {
    destroyPlayer();

    if (flvjs.isSupported()) {
        flvPlayer = flvjs.createPlayer({
            type: 'flv',
            url: url,
            isLive: true,
            hasAudio: true,
            hasVideo: true,
            cors: true
        });

        flvPlayer.attachMediaElement(videoElement);
        flvPlayer.load();

        // Auto-play might be blocked by browser policy; user interaction may be required.
        flvPlayer.play().catch(e => {
            console.warn("Auto-play prevented. User interaction required.");
        });

        flvPlayer.on(flvjs.Events.ERROR, (errType, errDetail) => {
            console.error('FLV Player Error:', errType, errDetail);
            handleStreamOffline();
        });
    } else {
        console.error('FLV.js is not supported in this browser.');
        alert('Browser Anda tidak mendukung pemutaran FLV.');
    }
}

function destroyPlayer() {
    if (flvPlayer) {
        flvPlayer.pause();
        flvPlayer.unload();
        flvPlayer.detachMediaElement();
        flvPlayer.destroy();
        flvPlayer = null;
    }
}

// Initial fetch and set interval for polling every 3 seconds
fetchStatus();
setInterval(fetchStatus, 3000);

// Manual refresh
refreshBtn.addEventListener('click', fetchStatus);
