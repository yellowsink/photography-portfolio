FROM denoland/deno
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/yellowsink/photography-portfolio

RUN apt-get install libimage-exiftool-perl

COPY src src
COPY deno.json .
COPY deno.lock .

RUN deno install --frozen

CMD ["deno", "run", "-A", "src/index.ts"]

VOLUME /app/portfolio.db