// Simple proxy server for status-tracker
// Usage: node proxy-server.js
// Optional environment variable PROXY_ALLOWLIST (comma-separated hostnames or host suffixes)

const express = require('express')
const fetch = require('node-fetch')
const {URL} = require('url')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

// Serve static files from current directory
app.use(express.static(__dirname))

const allowlistRaw = process.env.PROXY_ALLOWLIST || ''
const allowlist = allowlistRaw.split(',').map(s=>s.trim()).filter(Boolean)
if(allowlist.length === 0){
  console.warn('Warning: PROXY_ALLOWLIST not set — proxy will accept requests to any host. Set PROXY_ALLOWLIST to restrict hosts for safety.')
}

function hostAllowed(hostname){
  if(allowlist.length === 0) return true
  return allowlist.some(a => hostname === a || hostname.endsWith('.'+a) || hostname === a.replace(/^\*\./,''))
}

app.get('/proxy', async (req, res) => {
  const url = req.query.url
  if(!url){ return res.status(400).json({error:'missing url parameter'}) }
  let parsed
  try{ parsed = new URL(url) }catch(e){ return res.status(400).json({error:'invalid url'}) }

  if(!hostAllowed(parsed.hostname)){
    return res.status(403).json({error:'host not allowed by PROXY_ALLOWLIST'})
  }

  try{
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 15000)
    const r = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    const headers = {}
    r.headers.forEach((v,k)=>{ headers[k]=v })

    // read up to N chars from body to avoid huge transfers
    const bodyText = await r.text().catch(()=>null)
    const limit = 200000
    const snippet = bodyText ? (bodyText.length > limit ? bodyText.slice(0, limit) + '\n\n---TRUNCATED---' : bodyText) : ''

    res.set('Access-Control-Allow-Origin','*')
    res.json({ ok: r.ok, status: r.status, statusText: r.statusText, headers, body: snippet })
  }catch(e){
    const msg = e && e.type === 'aborted' ? 'timeout' : (e && e.message) ? e.message : 'fetch error'
    res.set('Access-Control-Allow-Origin','*')
    res.status(500).json({error: msg})
  }
})

app.get('/', (req,res)=>{
  res.send(`
    <h1>Development Server</h1>
    <p>Proxy server + static file serving for CORS-free development</p>
    <ul>
      <li><a href="/modify-avd-parser.html">Modify AVD Parser</a></li>
      <li><a href="/test-signature.html">Test Signature</a></li>
      <li><a href="/status-tracker.html">Status Tracker</a></li>
      <li><a href="/index.html">Index</a></li>
    </ul>
    <p>Proxy endpoint: /proxy?url=...</p>
  `)
})

app.listen(PORT, ()=>{ console.log(`Proxy server listening on http://localhost:${PORT}`) })