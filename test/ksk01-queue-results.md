# KSK01 paid queue integration test

Verified on NUC on 2026-11-15 using the same image as the deployed AdaQueue backend,
`adaqueue-backend:ksk01-1b2e757c7946` (image ID
`sha256:73cc7e8bf6227df15947abb9c9d06b8adae4059e9f805b582b52e22e2dd71f37`).
The test ran in a disposable container with `--network none`, a fresh SQLite
database, test signing keys, and a loopback staff-session fixture. It exercised
the HTTPS receiver and the legacy queue worker together as UID 1000.

| Check | Result |
| --- | --- |
| Allocate synthetic bill `QA-QUEUE-00016` | `POS00016-0000001` in the test database |
| Replay the allocation 3 times | Same queue number in each verified receipt, 1 SQLite row and 1 issued number |
| Read the bill and its queue status | Same queue number, receipt and state signatures verified |
| Apply kitchen and staff transitions | `WAIT_FOOD → READY → COMPLETED`, read back after each step |
| Payment | No real payment |

After the earlier cutover, KSK01 separately read a pre-existing queue and its
state through Cloudflare Tunnel. Both calls returned HTTP 200 and passed signature
verification. The test above creates and transitions the synthetic queue only
inside its disposable container.

## Re-run on Linux with Docker and OpenSSL

Run from the AdaQueue-Backend checkout. Set `KIOSK_SOURCE` to an
AdaFB-Kiosk-Croissant-Taiyaki checkout at `067d4f365c192f8e30720807195c312e976da028`.
If the combined image above is available, set `IMAGE` to that image and skip the
optional build block. Set `BACKEND_IMAGE` and `WORKER_IMAGE` to compatible local
images to build instead. The verified build used
`adafb-queue-backend:cf8c361-pickup` and `adaqueue-ksk01-worker:7049e476b035`,
respectively.

```sh
set -eu
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
mkdir "$work/qa"
cp test/ksk01-queue-isolated.mjs "$work/qa/verify.mjs"
cp "$KIOSK_SOURCE/database/candidate-paid-queue-sqlite.sql" "$work/qa/schema.sql"
chmod a+r "$work/qa/verify.mjs" "$work/qa/schema.sql"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost \
  -addext subjectAltName=IP:127.0.0.1 \
  -keyout "$work/qa/key.pem" -out "$work/qa/cert.pem"

# Optional build from source
if [ -z "${IMAGE:-}" ]; then
  npm ci
  npm run build
  mkdir "$work/build" "$work/build/dist"
  cp Dockerfile.ksk01-queue "$work/build/Dockerfile"
  cp dist/ksk01-queue.js dist/ksk01-queue-entry.js "$work/build/dist/"
  IMAGE=adaqueue-backend:ksk01-qa
  docker build --build-arg ADAQUEUE_BACKEND_IMAGE="$BACKEND_IMAGE" \
    --build-arg KSK01_QUEUE_WORKER_IMAGE="$WORKER_IMAGE" -t "$IMAGE" "$work/build"
fi

docker run --rm --network none --user 0:0 --entrypoint node \
  -v "$work/qa:/qa:ro" "$IMAGE" --no-warnings /qa/verify.mjs
```
