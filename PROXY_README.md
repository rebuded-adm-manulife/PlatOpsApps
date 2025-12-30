Proxy server for status-tracker

Quick start:
1. Install dependencies: npm install
2. Run the proxy: npm start
3. (Optional) Restrict allowed hosts: set environment variable PROXY_ALLOWLIST to a comma-separated list of hostnames (e.g., "example.com,api.example.org")
4. In the UI (Status Tracker), enable "Use proxy" and set Proxy Base to http://localhost:3000/proxy

Security:
- By default the proxy allows any host. Set PROXY_ALLOWLIST to restrict requests to known domains.
- Avoid exposing the proxy on public networks without authentication.
