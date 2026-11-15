# KSK01 staff pickup over TLS on port 3274

AdaQueue-Backend uses the existing paid Pickup profile and validates the KSK01
certificate with Node's `NODE_EXTRA_CA_CERTS`. The NUC user socket listens on
the AdaQueue Docker bridge and passes TCP to the existing SSH listener at
`127.0.0.1:3274`. TLS terminates on KSK01 before requests go to the local
Pickup API. The HTTPS origin forwards the staff authorization and preserves
the source API's response status.

## Verified on 2026-11-15

| Check | Result |
| --- | --- |
| Staff screen on the isolated QA profile for branch 00012 / POS 00016 | Queue **0012** was visible while preparing and became ready after both simulated stations finished |
| Press **รับอาหารแล้ว** | One completion POST for queue **0012** |
| Repeat the check 3 times | Same bill and queue **0012**, read back as `COMPLETED` with no action remaining |
| Transport | 10 requests over verified TLS through the test endpoint on bridge port **3274** |
| Payment and production queue writes from this QA run | 0 |

The staged browser test used the actual AdaQueue staff frontend and compiled
Pickup adapter with an isolated queue and staff session fixture. It included a
lost completion response and confirmed readback without sending a second
completion POST. After the production switch, the staff screen and the POS 00016
profile loaded, and a request from the running backend reached KSK01 on 3274.
The live Pickup API returned its expected HTTP 401 to an unauthenticated probe.
The separate paid queue route on 3262 still returned a signed queue and status.
The old 3275 relay was stopped after these checks.

## Files and installation

- `ops/ksk01-pickup-3274/https-origin.cjs` runs on KSK01 with
  `node https-origin.cjs <pickup-http-port>`. Place it in `https-3274` next to
  the existing Windows pickup-link script. Put `server.pfx` and its passphrase
  file `server.pass` beside it with access restricted to the task account.
  The certificate must have the AdaQueue Docker bridge IP in its SAN. Export
  only the public certificate to the NUC.
- `render-kiosk-link.ps1 -Original <existing-link> -Output <new-link>` writes a
  candidate for the existing scheduled task. It preserves the original
  restricted SSH key and server, launches the HTTPS origin alongside the
  existing tunnel, and changes the local tunnel destination to TLS port 3274.
  Keep the original script for rollback before installing the candidate.
- Render the `.socket.in` with the gateway address and device of the AdaQueue
  Docker bridge and install it as `ksk01-pickup-https-3274.socket` next to the
  supplied user service. Enable the socket after the bridge exists. It binds
  specifically to that interface, as the bridge gateway address is on the NUC.
- Copy the existing approved Pickup profile, change only `baseUrl` to
  `https://<queue-bridge-address>:3274`, and preserve its restrictive file mode
  and owner. Add `compose.pickup-3274.yml` after the existing Compose files with
  `PICKUP_3274_PROFILE` and `PICKUP_3274_CA` set to absolute paths. The base
  service should already use `/pickup/profile.json` and `NODE_EXTRA_CA_CERTS=/pickup/ca.pem`.
  Recreate only `queue-backend` to load the certificate and confirm the queue
  witness against the existing SQLite ledger before accepting orders.
- Check the staff screen, authenticated fixture flow, and the signed 3262
  readback before stopping 3275. For rollback use the original Windows
  pickup-link script and Compose files, restart the original relay, and verify
  the queue witness and staff endpoint.

## Source regression

Run `node --test test/ksk01-pickup-3274.test.mjs` from the repository root with
Node 22 and OpenSSL. It starts the shipped HTTPS origin against a disposable
HTTP fixture with an ephemeral certificate. It tests completion and three
repeat reads of queue 0012, authorization and route boundaries, and rejection
of plaintext and untrusted TLS.
