FROM denoland/deno
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/yellowsink/photography-portfolio

RUN apt-get update && apt-get install exiftool -y

COPY deno.json .
COPY deno.lock .

RUN deno install --frozen

COPY src src

CMD ["deno", "run", "-A", "src/index.ts"]

VOLUME /app/portfolio.db