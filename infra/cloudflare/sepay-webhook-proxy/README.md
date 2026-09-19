# SePay workers.dev webhook proxy

This Worker provides a stable public HTTPS endpoint for SePay without requiring a custom domain.

## Request flow

~~~text
SePay
  |
  v
https://quanlynhahang-sepay-webhook.<account>.workers.dev
  |
  v
Cloudflare Worker
  |
  v
https://<random>.trycloudflare.com
  |
  v
http://localhost:8080
  |
  v
QuanLyNhaHang API
~~~

The Worker only forwards these POST endpoints:

- `/api/customer-payments/sepay/webhook`
- `/api/customer-payments/sepay/readiness`

The Authorization header and JSON request body are forwarded to the local API. The API remains responsible for validating the SePay webhook API key and payment business rules.

## First-time setup

1. Make sure the Cloudflare account has a `workers.dev` subdomain enabled.
2. Authenticate Wrangler once:

~~~powershell
npx wrangler@latest login
~~~

3. Start the project tunnel:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\start-sepay-webhook-tunnel.ps1
~~~

The script creates the Quick Tunnel, deploys this Worker with the current Quick Tunnel as `UPSTREAM_ORIGIN`, prints the stable `workers.dev` webhook URL, and then keeps the readiness heartbeat alive.

## SePay URL

Use the URL printed by the script:

~~~text
https://quanlynhahang-sepay-webhook.<account>.workers.dev/api/customer-payments/sepay/webhook
~~~

Do not put the changing `trycloudflare.com` URL into SePay anymore.

The Quick Tunnel can still change on every restart; the Worker URL remains stable because the Worker name stays the same.

## Notes

- This is intended for local development/testing and is not a replacement for a production named tunnel or custom domain.
- Do not commit Cloudflare tokens, `.env`, or `.dev.vars` files.
- If `workers.dev` is not enabled, Wrangler deployment will fail until the account's Workers subdomain is configured.
