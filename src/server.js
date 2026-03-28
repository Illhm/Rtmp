const NodeMediaServer = require('node-media-server');
const express = require('express');

// Configuration for NodeMediaServer
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  }
};

const nms = new NodeMediaServer(config);

// State tracking for the API
const serverStartTime = Date.now();
const activeStreams = new Map();

// RTMP Events
nms.on('preConnect', (id, args) => {
  console.log(`[RTMP] Client Connecting... ID: ${id}`);
});

nms.on('postConnect', (id, args) => {
  console.log(`[RTMP] Client Connected! ID: ${id}`);
});

nms.on('doneConnect', (id, args) => {
  console.log(`[RTMP] Client Disconnected. ID: ${id}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  // Extract path and id correctly depending on the node-media-server event emit signature.
  // In node-media-server version 4+, the `postPublish` arguments are often `(id, StreamPath, args)`
  // but if the signature changed, `StreamPath` might be on the first argument.
  let clientId = 'unknown_id';
  let streamPathStr = '';

  if (typeof id === 'string') {
    clientId = id;
    streamPathStr = StreamPath || '';
  } else if (id && typeof id === 'object') {
    clientId = id.id || 'unknown_id';
    // Sometimes it's stored in id.appname or id.streamName or something
    streamPathStr = id.publishStreamPath || id.streamPath || (id.appname && id.streamName ? `/${id.appname}/${id.streamName}` : '') || StreamPath || '';
  }


  console.log(`[RTMP] Stream Incoming: ${streamPathStr} (ID: ${clientId})`);

  // Parse app name and stream key from StreamPath
  // Typically StreamPath looks like "/live/stream_key"
  const pathParts = (streamPathStr || '').split('/').filter(Boolean);
  const appName = pathParts[0] || 'unknown';
  const streamKey = pathParts[1] || 'unknown';

  // Track active stream
  activeStreams.set(clientId, {
    app: appName,
    key: streamKey,
    path: streamPathStr,
    startTime: Date.now()
  });

  console.log(`[RTMP] Stream Active! App: ${appName}, Key: ${streamKey}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  const clientId = id.id ? id.id : id;
  const stream = activeStreams.get(clientId);
  if (stream) {
    console.log(`[RTMP] Stream Stopped. App: ${stream.app}, Key: ${stream.key}`);
    activeStreams.delete(clientId);
  }
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log(`[RTMP] Client Playing Stream: ${StreamPath} (ID: ${id})`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log(`[RTMP] Client Stopped Playing Stream: ${StreamPath} (ID: ${id})`);
});

// Start RTMP Server
nms.run();


// Express API Setup
const app = express();
const API_PORT = process.env.API_PORT || 3000;

app.get('/status', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  const streams = Array.from(activeStreams.values()).map(stream => ({
    app: stream.app,
    key: stream.key,
    path: stream.path,
    uptimeSeconds: Math.floor((Date.now() - stream.startTime) / 1000)
  }));

  res.json({
    status: 'online',
    uptime: uptimeSeconds,
    activeStreamCount: streams.length,
    hasActiveStreams: streams.length > 0,
    streams: streams
  });
});

app.listen(API_PORT, () => {
  console.log(`[API] Status API listening on http://localhost:${API_PORT}/status`);
});
