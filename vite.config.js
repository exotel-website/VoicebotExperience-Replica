import { defineConfig } from 'vite';

function wsResolverPlugin() {
  return {
    name: 'ws-resolver-proxy',
    configureServer(server) {
      server.middlewares.use('/api/resolve-ws', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const target = url.searchParams.get('url');
        if (!target) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Missing ?url=' })); return; }
        try {
          const response = await fetch(target, { headers: { Accept: 'application/json' } });
          const text = await response.text();
          res.writeHead(response.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(text);
        } catch (err) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: err.message })); }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [wsResolverPlugin()],
  build: { outDir: 'dist' },
  server: { port: 3003 },
});
