---
title: Kubernetes
slug: kubernetes
summary: "How Kubernetes automates the deployment, scaling, and self-healing of containerized applications across a cluster of machines."
difficulty: intermediate
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 14
prerequisites: [docker]
related: [containerization, circuit-breakers]
seo_title: "Kubernetes Explained: Pods, Deployments, and Container Orchestration"
seo_description: "Learn how Kubernetes works: pods, nodes, deployments, services, and why it became the standard platform for running containers in production."
canonical_url: "/concepts/kubernetes"
code_examples:
  - language: yaml
    title: A Kubernetes Deployment
    code: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: my-api
      spec:
        replicas: 3          # Run 3 identical pods
        selector:
          matchLabels:
            app: my-api
        template:
          metadata:
            labels:
              app: my-api
          spec:
            containers:
              - name: my-api
                image: my-registry/my-api:v2.1.0
                ports:
                  - containerPort: 3000
                resources:
                  requests:
                    cpu: "100m"
                    memory: "128Mi"
                  limits:
                    cpu: "500m"
                    memory: "256Mi"
  - language: yaml
    title: A Kubernetes Service (load balancer)
    code: |
      apiVersion: v1
      kind: Service
      metadata:
        name: my-api-service
      spec:
        selector:
          app: my-api        # Targets all pods with this label
        ports:
          - port: 80
            targetPort: 3000
        type: LoadBalancer   # Provisions a cloud load balancer
---

## The Problem Docker Alone Cannot Solve

Docker is excellent for running a single container on a single machine. But real production systems run across tens or hundreds of machines, need to recover automatically from crashes, scale up under load, and deploy new versions without downtime. Docker by itself has no answer for any of this.

This is what **Kubernetes** (often abbreviated K8s) does. It is a platform for running containers at scale, deciding which machine each container goes on, restarting containers that crash, and routing traffic between them.

---

## The Core Idea: Desired State

Kubernetes operates on a simple principle: you tell it what you *want* (three copies of my API running), and it continuously works to make reality match that description. If a server crashes and takes two of those copies with it, Kubernetes notices and schedules two replacement containers on healthy machines. You do not intervene manually.

This is called **declarative configuration**, and it is the key mental shift when moving to Kubernetes.

---

## Key Building Blocks

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Kubernetes Cluster Structure</text>
  <!-- Control Plane -->
  <rect x="20" y="34" width="540" height="52" rx="6" fill="#2e3440" stroke="#88c0d0" stroke-width="2"/>
  <text x="290" y="53" fill="#88c0d0" font-family="sans-serif" font-size="11" text-anchor="middle" font-weight="bold">Control Plane</text>
  <text x="110" y="72" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">API Server</text>
  <text x="230" y="72" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Scheduler</text>
  <text x="350" y="72" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Controller Manager</text>
  <text x="470" y="72" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">etcd (state store)</text>
  <!-- Nodes -->
  <rect x="20" y="106" width="168" height="130" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="104" y="124" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Node 1</text>
  <rect x="32" y="132" width="144" height="36" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="104" y="146" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Pod: my-api (replica 1)</text>
  <text x="104" y="158" fill="#4c566a" font-family="sans-serif" font-size="8" text-anchor="middle">container + shared network/storage</text>
  <rect x="32" y="174" width="144" height="36" rx="4" fill="#3b4252" stroke="#81a1c1" stroke-width="1"/>
  <text x="104" y="190" fill="#d8dee9" font-family="sans-serif" font-size="9" text-anchor="middle">Pod: worker-job</text>
  <text x="104" y="202" fill="#4c566a" font-family="sans-serif" font-size="8" text-anchor="middle">different workload</text>
  <rect x="206" y="106" width="168" height="130" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="290" y="124" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Node 2</text>
  <rect x="218" y="132" width="144" height="36" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="290" y="146" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Pod: my-api (replica 2)</text>
  <text x="290" y="158" fill="#4c566a" font-family="sans-serif" font-size="8" text-anchor="middle">container + shared network/storage</text>
  <rect x="392" y="106" width="168" height="130" rx="6" fill="#2e3440" stroke="#4c566a" stroke-width="1"/>
  <text x="476" y="124" fill="#d8dee9" font-family="sans-serif" font-size="10" text-anchor="middle" font-weight="bold">Node 3</text>
  <rect x="404" y="132" width="144" height="36" rx="4" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
  <text x="476" y="146" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Pod: my-api (replica 3)</text>
  <text x="476" y="158" fill="#4c566a" font-family="sans-serif" font-size="8" text-anchor="middle">container + shared network/storage</text>
  <!-- Connectors control plane -> nodes -->
  <path d="M 104 86 L 104 106" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 290 86 L 290 106" stroke="#4c566a" stroke-width="1" fill="none"/>
  <path d="M 476 86 L 476 106" stroke="#4c566a" stroke-width="1" fill="none"/>
  <!-- Service label -->
  <rect x="20" y="246" width="540" height="8" rx="3" fill="none" stroke="none"/>
  <text x="290" y="253" fill="#ebcb8b" font-family="sans-serif" font-size="9" text-anchor="middle">A Service sits in front of all pods, load-balancing traffic across replicas</text>
</svg>

**Pod**: The smallest unit in Kubernetes. A pod wraps one (or sometimes a few tightly coupled) containers and gives them a shared IP address and storage volumes. You almost never interact with pods directly.

**Deployment**: A blueprint that says "I want N replicas of this pod". Kubernetes creates the pods, spreads them across available nodes, and continuously reconciles if any are missing or unhealthy.

**Service**: A stable network endpoint that sits in front of a set of pods and load-balances traffic across them. Because pods are ephemeral and get new IP addresses when rescheduled, you always talk to a Service rather than a pod directly.

**Node**: A physical or virtual machine in the cluster. The control plane schedules pods onto nodes based on available resources.

**Control Plane**: The cluster's brain. It watches the current state, compares it to the desired state, and issues instructions to make them match. You interact with it via `kubectl` commands or by applying YAML files.

---

## Self-Healing and Rolling Deployments

Two things Kubernetes handles automatically that teams used to do manually:

**Self-healing**: If a container crashes, the kubelet (an agent on each node) restarts it. If an entire node goes down, the control plane reschedules its pods onto surviving nodes. You do not get paged at 3am because a single pod crashed.

**Rolling deployments**: When you update an image version, Kubernetes replaces pods one at a time, waiting for each new pod to pass health checks before killing the old one. Traffic never drops to zero. If the new version fails health checks, the rollout pauses automatically.

---

## When You Do Not Need Kubernetes

Kubernetes is powerful but genuinely complex. For a single-service app or a small team, it often adds more operational overhead than it solves. Managed platforms like [Railway](https://railway.app/), [Render](https://render.com/), or [AWS App Runner](https://aws.amazon.com/apprunner/) give you container deployments with autoscaling without managing a cluster yourself.

Kubernetes becomes the right choice when you have many independent services, need fine-grained resource control, or are running at a scale where managed platforms become prohibitively expensive.

---

## Further Reading

- [Kubernetes explained in 6 minutes (TechWorld with Nana)](https://www.youtube.com/watch?v=TlHvYWVUZyc) — the clearest short intro available
- [The Kubernetes Handbook (freeCodeCamp)](https://www.freecodecamp.org/news/the-kubernetes-handbook/) — comprehensive written guide for engineers new to K8s
- [Pods vs Deployments vs Services](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — official docs on the core abstractions
- [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) — set up a cluster from scratch to truly understand what K8s manages for you
