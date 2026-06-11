---
title: CI/CD Deployment Strategies
slug: cicd-deployment-strategies
summary: "Decoupling deployments from releases using blue-green, canary, rolling updates, and expand-and-contract database migration patterns."
difficulty: intermediate
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 12
prerequisites: [containerization]
related: [docker, kubernetes]
seo_title: "CI/CD Deployment Strategies: Zero-Downtime Patterns and Migrations"
seo_description: "Master zero-downtime deployment patterns. Learn Blue-Green, Canary, and Rolling updates, alongside the Expand-and-Contract database migration pattern."
canonical_url: "/concepts/cicd-deployment-strategies"
citations:
  - title: "Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation"
    author: "Jez Humble and David Farley"
    chapter: "Chapter 10: Deploying and Releasing Applications"
    page_range: "257-285"
    external_link: "https://www.pearson.com/en-us/subject-catalog/p/continuous-delivery-reliable-software-releases-through-build-test-and-deployment-automation/P200000000570"
code_examples:
  - language: yaml
    title: Kubernetes Zero-Downtime Rolling Update Deployment
    code: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: billing-service
        labels:
          app: billing
      spec:
        replicas: 4
        strategy:
          type: RollingUpdate
          rollingUpdate:
            maxSurge: 25%
            maxUnavailable: 0
        selector:
          matchLabels:
            app: billing
        template:
          metadata:
            labels:
              app: billing
          spec:
            containers:
            - name: app
              image: billing:v2.1.0
              ports:
              - containerPort: 8080
              readinessProbe:
                httpGet:
                  path: /healthz/ready
                  port: 8080
                initialDelaySeconds: 5
                periodSeconds: 10
              livenessProbe:
                httpGet:
                  path: /healthz/live
                  port: 8080
                initialDelaySeconds: 15
                periodSeconds: 20
  - language: sql
    title: Expand-and-Contract Database Schema Migration
    code: |
      -- PHASE 1: EXPAND (Deploy new schema alongside old code)
      -- Add a new column to store updated structures, leaving the old untouched
      ALTER TABLE users ADD COLUMN phone_number_v2 VARCHAR(20) DEFAULT NULL;

      -- Sync writes from both old and new code using a trigger
      CREATE OR REPLACE FUNCTION sync_phone_numbers()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.phone_number IS NOT NULL AND NEW.phone_number_v2 IS NULL THEN
          NEW.phone_number_v2 := NEW.phone_number;
        ELSIF NEW.phone_number_v2 IS NOT NULL AND NEW.phone_number IS NULL THEN
          NEW.phone_number := NEW.phone_number_v2;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_sync_phone
      BEFORE INSERT OR UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION sync_phone_numbers();

      -- PHASE 2: MIGRATE (Data backfill in the background)
      -- Run in small batches to prevent database locking
      -- UPDATE users SET phone_number_v2 = phone_number 
      -- WHERE phone_number_v2 IS NULL AND phone_number IS NOT NULL;

      -- PHASE 3: CONTRACT (Clean up old schema elements after full deployment)
      DROP TRIGGER IF EXISTS trg_sync_phone ON users;
      DROP FUNCTION IF EXISTS sync_phone_numbers;
      ALTER TABLE users DROP COLUMN phone_number;
      ALTER TABLE users RENAME COLUMN phone_number_v2 TO phone_number;
---

## Releasing vs Deploying Code

In modern infrastructure engineering, developers must draw a clear distinction between deploying software and releasing features:

* **Continuous Integration (CI)**: The automated practice of merging code changes into a shared repository, running compilation steps, checking code style, and running test suites to catch errors early.
* **Continuous Delivery (CD)**: Automating the build and release pipeline so that the codebase is always in a deployable state. Deployments to production may still require manual approval.
* **Continuous Deployment**: Automating the entire pipeline. Every change that passes automated tests is deployed to production without human intervention.
* **Deployment**: The physical installation and execution of a new version of an application on host servers or containers. A deployed application runs in production but does not have to be active for users.
* **Release**: The activation of a new feature or version for user traffic. This is typically managed via routing tables, load balancers, or application-level feature flags.

By separating deployment from release, teams can verify new software versions in production using test data before directing real user traffic to them.

---

## Zero-Downtime Deployment Patterns

To update services without dropping user requests, modern pipelines use zero-downtime deployment patterns:

### Blue-Green Deployments
This approach runs two identical production environments side-by-side:

* **Blue** represents the active, live environment receiving traffic.
* **Green** is the idle environment where the new code version is deployed.

Once the green environment is successfully deployed and passes sanity checks, the load balancer or router switches user traffic from Blue to Green. If a problem occurs, reverting is as simple as switching the router back to Blue. The primary downside is cost, as this requires doubling server capacity during deployment.

### Canary Deployments
Instead of switching all traffic at once, a canary deployment routes traffic to the new version gradually:

* The new version is deployed to a small subset of instances (the canaries).
* The router directs a small percentage of user traffic (such as 1% or 5%) to these instances.
* Automated systems monitor error rates, latency, and system load.
* If metrics remain healthy, traffic is incremented (to 10%, 50%, then 100%). If anomalies are detected, the router immediately stops sending traffic to the canary nodes.

---

## Kubernetes Rolling Updates

Kubernetes automates deployments using a rolling update strategy. Rather than shutting down all containers and starting new ones (which causes downtime), Kubernetes replaces instances of the old container with the new version incrementally.

Two main parameters control this pacing:

* **`maxSurge`**: The maximum number of containers that can be created over the desired replica count during the update.
* **`maxUnavailable`**: The maximum number of containers that can be offline relative to the target replica count.

Setting `maxUnavailable: 0` ensures the cluster retains full capacity throughout the deployment. Crucially, Kubernetes relies on `readinessProbes` to determine when a new container is ready to accept traffic. If a container fails its readiness check, Kubernetes stops routing traffic to it and halts the rollout, preventing a bad build from taking down the cluster.

---

## Database Schema Migrations: Expand-and-Contract

While application servers are stateless and easy to replace, databases store state. If an application update requires changing a database schema, deploying the new code and updating the schema simultaneously can cause crashes. Old application instances still running during a rolling update will fail when columns they expect are renamed or dropped.

To avoid this, teams use the **Expand-and-Contract** (or Parallel Run) migration pattern:

<svg viewBox="0 0 580 320" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Expand-and-Contract Database Migrations</text>
  <rect x="20" y="50" width="110" height="70" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5"/>
  <text x="75" y="70" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">State A: Baseline</text>
  <text x="75" y="88" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">App V1 runs</text>
  <text x="75" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Uses old_column</text>
  <rect x="160" y="50" width="110" height="70" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="215" y="70" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">State B: Expand</text>
  <text x="215" y="88" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">Add new_column</text>
  <text x="215" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Sync writes to both</text>
  <rect x="300" y="50" width="110" height="70" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="355" y="70" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">State C: Rollout</text>
  <text x="355" y="88" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">App V2 fully active</text>
  <text x="355" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Reads new_column</text>
  <rect x="440" y="50" width="110" height="70" rx="4" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="495" y="70" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">State D: Contract</text>
  <text x="495" y="88" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Drop old_column</text>
  <text x="495" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Clean up complete</text>
  <path d="M 130 85 L 155 85" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <path d="M 270 85 L 295 85" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <path d="M 410 85 L 435 85" stroke="#eceff4" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="40" y="160" width="500" height="130" rx="4" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="60" y="180" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold">Migration Steps:</text>
  <text x="60" y="200" fill="#d8dee9" font-family="sans-serif" font-size="9">* Step 1: Add new column, deploy code that writes to both but reads from old (Expand).</text>
  <text x="60" y="220" fill="#d8dee9" font-family="sans-serif" font-size="9">* Step 2: Backfill historical data in background from old column to new column.</text>
  <text x="60" y="240" fill="#d8dee9" font-family="sans-serif" font-size="9">* Step 3: Deploy code that reads and writes exclusively to the new column.</text>
  <text x="60" y="260" fill="#d8dee9" font-family="sans-serif" font-size="9">* Step 4: Drop the old column and delete the sync trigger (Contract).</text>
  <defs>
    <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#d8dee9"/>
    </marker>
  </defs>
</svg>

By splitting the change into multiple small, backwards-compatible deployments, the application remains fully functional at every point of the update cycle.

---

## Pipeline Feedback Loops

Deploying software safely requires automated monitoring and feedback loops. A modern continuous deployment pipeline is integrated directly into Application Performance Monitoring (APM) tools.

During a deployment rollout (especially during Rolling or Canary phases), the deployment controller listens to performance APIs:

* **Error Rates**: A sudden spike in HTTP 5xx responses triggers an automatic rollback.
* **Latency Spikes**: If database queries or page response times exceed set thresholds, the deployment is aborted.
* **Host Health**: High memory utilization or CPU spikes on new containers trigger an immediate revert.

By coupling the deployment system directly to observability metrics, the loop is closed: bad code is caught, isolated, and rolled back without requiring manual intervention from engineers.

---

## Further Reading

* [Continuous Delivery](https://www.pearson.com/en-us/subject-catalog/p/continuous-delivery-reliable-software-releases-through-build-test-and-deployment-automation/P200000000570) — Jez Humble and David Farley's foundational text on software deployment automation.
* [Kubernetes Deployment Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — Official specifications for rolling updates and surge allocations.
* [Database Refactoring: Expand-and-Contract](https://martinfowler.com/articles/evodb.html) — Martin Fowler's detailed breakdown of evolutionary database schema design.
