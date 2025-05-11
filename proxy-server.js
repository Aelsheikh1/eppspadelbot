const http = require('http');
const httpProxy = require('http-proxy');
const os = require('os');

// Function to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '192.168.100.11'; // Fallback to previously working IP
}

// Listen on all interfaces (0.0.0.0) to make it accessible from any network interface
const ip = '0.0.0.0'; // Listen on all interfaces
const port = 3001;

// Create a proxy server with explicit IPv4 configuration
const proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:3000', // Use explicit IPv4 localhost address
  ws: true, // Enable WebSocket proxying
  changeOrigin: true, // Handle origin changes
  secure: false, // Don't verify SSL certs
  // Don't set host header to allow the browser to set it
  // This fixes Firebase auth issues
  // Preserve the original host in the X-Forwarded headers
  xfwd: true,
  autoRewrite: true, // Rewrite Location headers
  protocolRewrite: 'http', // Rewrite protocol in redirects
  // Force IPv4 usage
  ipv6: false
});

// Handle proxy errors
proxy.on('error', function(err, req, res) {
  console.error('Proxy error:', err);
  if (res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
});

// Add CORS headers to all responses
proxy.on('proxyRes', function(proxyRes, req, res) {
  // Add CORS headers
  proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
  proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
});

// Create the server
const server = http.createServer(function(req, res) {
  // Log the request
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Forward the request to the React dev server
  proxy.web(req, res);
});

// Listen for the upgrade event (WebSockets)
server.on('upgrade', function (req, socket, head) {
  proxy.ws(req, socket, head);
});

// Start the server
server.listen(port, ip, function() {
  // Get all network interfaces to show available addresses
  const interfaces = os.networkInterfaces();
  console.log('Available network interfaces:');
  
  // Display all available IP addresses
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  - http://${iface.address}:${port} (${name})`);
      }
    }
  }
  
  console.log(`\nProxy server running on port ${port}`);
  console.log(`Forwarding requests to http://localhost:3000`);
  console.log('\nTo access from mobile devices, use one of the above URLs');
});
