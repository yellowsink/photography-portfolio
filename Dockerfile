FROM denoland/deno:alpine
WORKDIR /app

COPY src src
COPY deno.json .
COPY deno.lock .

RUN deno install --frozen

CMD ["deno", "run", "-A", "src/index.ts"]

VOLUME /app/portfolio.db