# Build context must be the repo root (workspace deno.json + packages/howl
# live one level up). Invoke from the repo root:
#   docker build -f examples/software-www/Dockerfile .

FROM denoland/deno:latest AS builder

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ENV DENO_BUILD_STAGE=PRODUCTION

WORKDIR /app

COPY . .

WORKDIR /app/examples/software-www

RUN deno task build
RUN deno cache --reload ./dist/compiled-entry.js
RUN deno task compile

FROM denoland/deno:latest

WORKDIR /app

COPY --from=builder /app/examples/software-www/dist/bin/software-www /app/bin/

CMD ["./bin/software-www"]
