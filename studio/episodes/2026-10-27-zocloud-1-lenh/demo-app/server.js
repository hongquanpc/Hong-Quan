// Tiny static server. ZoCloud gives the port in PORT; listen on 0.0.0.0 so the router can reach it.
const http = require('http');
const fs = require('fs');
const path = require('path');

const page = fs.readFileSync(path.join(__dirname, 'index.html'));
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page);
}).listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('Cà Phê Phố Cổ đang chạy'));
