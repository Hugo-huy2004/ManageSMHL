# ManageSMHL

## Environment

Copy the example files before running locally:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend variables:

- `HOST`: backend bind host.
- `PORT`: backend HTTP/WebSocket port.
- `MONGODB_URI`: MongoDB connection string.
- `CORS_ORIGIN`: allowed frontend origins, comma-separated.
- `ADMIN_PASSWORD`: login password.
- `ADMIN_TOKEN`: session token returned after login.

Frontend variables:

- `VITE_API_BASE_URL`: API base URL used by the browser, for example `http://localhost:5050/api`.
- `VITE_WS_URL`: WebSocket URL, for example `ws://localhost:5050`.
- `VITE_API_PROXY_TARGET`: optional Vite dev proxy target when `VITE_API_BASE_URL=/api`.
