---
title: Docker
slug: docker
summary: "The tool that made containers practical: how Docker packages, distributes, and runs containers with a simple developer workflow."
difficulty: beginner
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 10
prerequisites: [containerization]
related: [kubernetes]
seo_title: "Docker Explained: Images, Containers, and the Build-Ship-Run Model"
seo_description: "Learn how Docker works: building images from Dockerfiles, running containers, and pushing to registries. Written for backend engineers, not DevOps specialists."
canonical_url: "/concepts/docker"
code_examples:
  - language: dockerfile
    title: A minimal Dockerfile
    code: |
      # Start from an official base image (Node 20 on Alpine Linux)
      FROM node:20-alpine

      # Set the working directory inside the container
      WORKDIR /app

      # Copy dependency files first (cached as a separate layer)
      COPY package*.json ./
      RUN npm ci --only=production

      # Copy the rest of the application code
      COPY . .

      # Expose the port the app listens on
      EXPOSE 3000

      # The command to run when the container starts
      CMD ["node", "server.js"]
  - language: bash
    title: Common Docker commands
    code: |
      # Build an image from the current directory
      docker build -t my-api:latest .

      # Run a container from that image (detached, port mapped)
      docker run -d -p 3000:3000 --name my-api my-api:latest

      # View running containers
      docker ps

      # Stream logs from a running container
      docker logs -f my-api

      # Open a shell inside a running container
      docker exec -it my-api sh

      # Stop and remove
      docker stop my-api && docker rm my-api
---

## What Docker Is

[Docker](https://www.docker.com/) is the tool that made containers mainstream. Before Docker (2013), Linux containers existed but required deep kernel knowledge to set up. Docker wrapped them in a simple CLI and an image format that anyone could use.

The core Docker workflow is three steps: **build** an image, **push** it to a registry, **run** it anywhere.

---

## The Dockerfile

A `Dockerfile` is a plain text recipe that describes how to build an image. Docker reads it top to bottom, executing each instruction and saving the result as a new layer.

<svg viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="280" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Image layers built from a Dockerfile</text>
  <!-- Layer stack (bottom to top visually) -->
  <rect x="60" y="148" width="440" height="28" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="280" y="166" fill="#81a1c1" font-family="sans-serif" font-size="10" text-anchor="middle">Layer 1: FROM node:20-alpine  (base OS + Node runtime — pulled from registry, cached)</text>
  <rect x="60" y="116" width="440" height="28" rx="4" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="280" y="134" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Layer 2: COPY package.json + RUN npm ci  (dependencies — cached until package.json changes)</text>
  <rect x="60" y="84" width="440" height="28" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="280" y="102" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle">Layer 3: COPY . .  (your app code — rebuilt on every code change)</text>
  <rect x="60" y="52" width="440" height="28" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="2"/>
  <text x="280" y="70" fill="#a3be8c" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Writable layer: runtime writes (logs, temp files) — discarded when container stops</text>
  <!-- Arrow -->
  <text x="16" y="100" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">build</text>
  <text x="16" y="110" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">order</text>
  <path d="M 20 148 L 20 52" stroke="#4c566a" stroke-width="1.5" fill="none" marker-end="url(#up)"/>
  <defs>
    <marker id="up" markerWidth="8" markerHeight="8" refX="3" refY="6" orient="auto">
      <path d="M0,6 L3,0 L6,6 z" fill="#4c566a"/>
    </marker>
  </defs>
</svg>

The order of instructions matters for caching. Copying `package.json` before the rest of your source files means the `npm ci` layer gets cached and skipped on every rebuild where only your code changed. This keeps builds fast.

---

## Images and Registries

An image is just a stack of layers plus some metadata (what command to run, what port to expose). Once built, you **tag** it and **push** it to a registry — a storage server for images.

[Docker Hub](https://hub.docker.com/) is the public default. Companies typically run a private registry (AWS ECR, Google Artifact Registry, or a self-hosted Harbor) so images stay internal.

When a server pulls an image, it only downloads the layers it doesn't already have. If the base Node image is already cached locally, only your application layers transfer.

---

## Running Containers

`docker run` takes an image and starts a container from it. Key options engineers use daily:

* `-d` — run detached (in the background)
* `-p 3000:3000` — map port 3000 on the host to port 3000 inside the container
* `-e DATABASE_URL=...` — inject environment variables
* `--name my-api` — give the container a name instead of the random default
* `-v /data:/app/data` — mount a host directory into the container (for persistent data)

A container runs until its main process exits. If the process crashes, the container stops. Docker has a `--restart always` flag that will restart it automatically, but in production you'd normally hand this responsibility to an orchestrator like Kubernetes.

---

## Docker Compose

For local development with multiple services (an API, a database, a cache), [Docker Compose](https://docs.docker.com/compose/) lets you define them all in a single `docker-compose.yml` and start everything with one command: `docker compose up`. Each service gets its own container and they share a private network, so they can reach each other by name.

---

## Further Reading

- [Docker getting started guide](https://docs.docker.com/get-started/) — the official tutorial, genuinely well-written
- [Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/) — how to write efficient, cache-friendly Dockerfiles
- [Docker in 100 seconds (Fireship)](https://www.youtube.com/watch?v=Gjnup-PuquQ) — the fastest useful overview you will find
- [Docker Compose overview](https://docs.docker.com/compose/) — orchestrating multi-service local environments
