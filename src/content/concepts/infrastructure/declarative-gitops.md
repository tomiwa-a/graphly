---
title: Declarative GitOps
slug: declarative-gitops
summary: "Understand how GitOps controllers automate cluster management, continuously reconcile desired Git states, and prevent manual configuration drift."
difficulty: intermediate
chapterId: infrastructure
domain: Infrastructure
estimatedMinutes: 12
prerequisites: [kubernetes, cicd-deployment-strategies]
related: [docker, containerization]
seo_title: "Declarative GitOps: Pull Pipelines, Drift Correction, and Secrets"
seo_description: "Deep dive into declarative GitOps. Compare push vs pull models, design reconciliation loops, manage Kubernetes secrets, and configure ArgoCD."
canonical_url: "/concepts/declarative-gitops"
citations:
  - title: "GitOps: The Cloud Native Way"
    author: "Florian Beetz and Simon Harrer"
    chapter: "Introduction to GitOps"
    page_range: "N/A"
    external_link: "https://www.innoq.com/en/publications/gitops-book/"
  - title: "GitOps Principles v1.0.0"
    author: "OpenGitOps Project"
    chapter: "Core Principles"
    page_range: "N/A"
    external_link: "https://opengitops.dev/"
code_examples:
  - language: go
    title: GitOps Cluster Reconciler Simulation
    code: |
      package main

      import (
          "encoding/json"
          "fmt"
          "time"
      )

      type Resource struct {
          Name     string `json:"name"`
          Replicas int    `json:"replicas"`
          Image    string `json:"image"`
      }

      // MockGitRepository simulates a remote Git store holding desired state
      func FetchDesiredStateFromGit() ([]byte, error) {
          desired := []Resource{
              {Name: "web-server", Replicas: 3, Image: "nginx:1.25"},
              {Name: "db-proxy", Replicas: 2, Image: "envoy:1.28"},
          }
          return json.Marshal(desired)
      }

      // MockK8sCluster simulates the live Kubernetes cluster state
      type MockK8sCluster struct {
          LiveState map[string]*Resource
      }

      func (c *MockK8sCluster) FetchLiveState() map[string]*Resource {
          return c.LiveState
      }

      func (c *MockK8sCluster) ApplyChange(r Resource) {
          fmt.Printf("[K8s Cluster] Appying resource update: %s (Replicas: %d, Image: %s)\n", r.Name, r.Replicas, r.Image)
          c.LiveState[r.Name] = &r
      }

      func (c *MockK8sCluster) DeleteResource(name string) {
          fmt.Printf("[K8s Cluster] Deleting resource: %s\n", name)
          delete(c.LiveState, name)
      }

      // Reconcile compares desired Git state against live cluster resources
      func Reconcile(cluster *MockK8sCluster) {
          desiredBytes, _ := FetchDesiredStateFromGit()
          var desiredState []Resource
          json.Unmarshal(desiredBytes, &desiredState)

          liveState := cluster.FetchLiveState()
          desiredMap := make(map[string]*Resource)

          // 1. Identify updates or missing resources
          for _, res := range desiredState {
              desiredMap[res.Name] = &res
              live, exists := liveState[res.Name]
              if !exists {
                  fmt.Printf("[Reconciler] DRIFT DETECTED: Missing resource %s\n", res.Name)
                  cluster.ApplyChange(res)
              } else if live.Replicas != res.Replicas || live.Image != res.Image {
                  fmt.Printf("[Reconciler] DRIFT DETECTED: Resource %s mismatch. Live: {Replicas: %d, Image: %s}, Desired: {Replicas: %d, Image: %s}\n", 
                      res.Name, live.Replicas, live.Image, res.Replicas, res.Image)
                  cluster.ApplyChange(res)
              }
          }

          // 2. Identify orphaned resources (present in live cluster but deleted from Git)
          for name := range liveState {
              if _, exists := desiredMap[name]; !exists {
                  fmt.Printf("[Reconciler] DRIFT DETECTED: Orphaned resource %s found in cluster but missing from Git\n", name)
                  cluster.DeleteResource(name)
              }
          }
      }

      func main() {
          // Initialize live cluster with an out-of-sync database proxy and a manual override
          cluster := &MockK8sCluster{
              LiveState: map[string]*Resource{
                  "web-server":      {Name: "web-server", Replicas: 3, Image: "nginx:1.25"},
                  "db-proxy":        {Name: "db-proxy", Replicas: 1, Image: "envoy:1.25"}, // drift replicas & image
                  "rogue-container": {Name: "rogue-container", Replicas: 1, Image: "malicious:latest"}, // manual override
              },
          }

          fmt.Println("Starting Reconciler Loop simulation...")
          Reconcile(cluster)
          fmt.Println("Reconciliation completed. Live cluster matches Git desired state.")
      }
  - language: yaml
    title: ArgoCD Application Resource Specification
    code: |
      apiVersion: argoproj.io/v1alpha1
      kind: Application
      metadata:
        name: production-web-server
        namespace: argocd
      spec:
        project: default
        source:
          repoURL: 'https://github.com/example/gitops-infra.git'
          targetRevision: HEAD
          path: deployments/production
        destination:
          server: 'https://kubernetes.default.svc'
          namespace: prod-apps
        syncPolicy:
          automated:
            prune: true
            selfHeal: true
          syncOptions:
            - CreateNamespace=true
---

## Declarative Infrastructure as Code

Traditional deployment systems rely on **imperative actions**. Under an imperative model, a script or CI pipeline runs a series of commands to configure servers (e.g. `kubectl apply -f deployment.yaml` or `docker run ...`). 

If a command fails halfway through, the system is left in an unverified state. Furthermore, if an engineer manually edits a server configuration, that change bypasses the pipeline, creating configuration drift.

**Declarative GitOps** replaces imperative steps with a single system rule: the desired state of the entire infrastructure is declared in config files stored in Git. Git serves as the single source of truth. 

Instead of running push scripts, automated reconciliation agents continuously read the Git files and force the target environment to match the definitions, ensuring repeatability and eliminating manual configuration drift.

---

## Push-Based vs. Pull-Based Deployments

GitOps architectures generally utilize one of two deployment delivery patterns:

* **Push-Based (CI-Driven)**: The CI system (e.g., GitHub Actions, GitLab CI) is triggered when code changes in Git. The pipeline runner is authenticated with the target cluster API and executes deployment commands directly. 
  * *Vulnerability*: The CI runner must store high-privilege cluster credentials, creating a large security attack surface.
* **Pull-Based (Agent-Driven)**: An agent (such as ArgoCD or Flux) runs inside the production cluster. The agent periodically polls the Git repository for changes. When an update is detected, the agent pulls the configuration and applies it locally within the cluster.
  * *Security Benefit*: Cluster credentials never leave the cluster network, and the firewall can block all inbound access.

```
Push-Based:
Git Push ---> CI Runner --[Holds Cluster Credentials]---> K8s API (Inbound Open)

Pull-Based:
Git Push ---> Git Repos <=== [Poll & Pull: ArgoCD Agent] === K8s API (No Inbound)
```

---

## The Continuous Reconciliation Loop

The core engine of a GitOps agent is the **reconciliation loop**. It runs as an infinite control loop executing three sequential phases:

```
+------------+     +-------------------+     +-------------------------+
| Read Git   | --> | Compare (Diff)    | --> | Apply Updates (Sync)    |
| (Desired)  |     | Desired vs Live   |     | Force Live to Match Git |
+------------+     +-------------------+     +-------------------------+
      ^                                                   |
      +----------------- Repeat loop --------------------+
```

1. **Observe**: Read the desired state from Git and query the active cluster API to discover the live state.
2. **Analyze**: Diff the desired state against the live state to detect configuration drift.
3. **Reconcile**: If differences are found, issue API commands to synchronize the cluster.

### Drift Correction (Auto-Healing)

If an administrator bypasses Git and uses a CLI tool to scale a live deployment, the reconciler detects this drift during its next cycle. Because the change does not exist in Git, the controller automatically reverses the modification (reverting the replica count back to the Git definition), securing the cluster from undocumented overrides.

---

## Configuration Templating and Customization

Storing raw static manifests for multiple environments (e.g., dev, staging, production) leads to duplication and errors. GitOps projects use templating engines to manage variations:

* **Kustomize**: A template-free customizer. It utilizes a base file containing common parameters, with overlay directories modifying specific parameters (such as replicas or image tags) for different environments without copying the base code.
* **Helm**: A package manager using template files populated by dynamic `values.yaml` files. The GitOps agent renders the Helm charts to generate final manifests before applying them to the cluster.

---

## Secret Management in Git

Because Git repositories are cloned and stored across developer machines, committing plain text passwords or private keys is a severe security risk. To implement GitOps securely, you must encrypt secret files before committing them:

* **Sealed Secrets**: A custom resource definition (CRD) system. A controller runs inside the cluster containing a public/private key pair. Developers encrypt secrets locally using the public key (creating a `SealedSecret` file which is safe to commit). Only the in-cluster controller can decrypt this file to generate a standard Kubernetes secret.
* **Mozilla SOPS (Secrets Operations)**: A tool that encrypts values within configuration files using keys from KMS providers (e.g., AWS KMS, HashiCorp Vault). The GitOps agent decrypts the files dynamically during the reconciliation sync phase.

---

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="25" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Agent-Driven (Pull-Based) GitOps Loop</text>
  <rect x="20" y="100" width="100" height="50" rx="6" fill="#2e3440" stroke="#81a1c1" stroke-width="1.5"/>
  <text x="70" y="123" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Developer</text>
  <text x="70" y="136" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">Local Commits</text>
  <rect x="170" y="50" width="120" height="50" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="230" y="73" fill="#eceff4" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">Git Repository</text>
  <text x="230" y="86" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">(Desired State)</text>
  <rect x="340" y="30" width="220" height="210" rx="8" fill="#3b4252" stroke="#4c566a" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="450" y="45" fill="#81a1c1" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">KUBERNETES CLUSTER</text>
  <rect x="380" y="65" width="140" height="40" rx="4" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.2"/>
  <text x="450" y="82" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">ArgoCD / Flux Agent</text>
  <text x="450" y="93" fill="#ebcb8b" font-family="sans-serif" font-size="7" text-anchor="middle">Polls &amp; Compares</text>
  <rect x="380" y="125" width="140" height="40" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1.2"/>
  <text x="450" y="142" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Kubernetes API</text>
  <text x="450" y="153" fill="#88c0d0" font-family="sans-serif" font-size="7" text-anchor="middle">Engine Gatekeeper</text>
  <rect x="380" y="185" width="140" height="40" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.2"/>
  <text x="450" y="202" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">Live Resources</text>
  <text x="450" y="213" fill="#a3be8c" font-family="sans-serif" font-size="7" text-anchor="middle">Pods / Services</text>
  <path d="M 120 125 L 170 85" stroke="#81a1c1" stroke-width="1.5" fill="none" marker-end="url(#git_arrow)"/>
  <defs>
    <marker id="git_arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#81a1c1"/>
    </marker>
  </defs>
  <text x="135" y="100" fill="#81a1c1" font-family="sans-serif" font-size="8" text-anchor="middle">1. git push</text>
  <path d="M 380 80 L 290 80" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#git_arrow)"/>
  <text x="335" y="73" fill="#ebcb8b" font-family="sans-serif" font-size="8" text-anchor="middle">2. Poll / Pull</text>
  <path d="M 450 105 L 450 125" stroke="#ebcb8b" stroke-width="1.5" fill="none" marker-end="url(#git_arrow)"/>
  <path d="M 430 125 L 430 105" stroke="#88c0d0" stroke-width="1.5" fill="none" marker-end="url(#git_arrow)"/>
  <text x="400" y="120" fill="#81a1c1" font-family="sans-serif" font-size="7" text-anchor="middle">3. Diff</text>
  <path d="M 450 165 L 450 185" stroke="#a3be8c" stroke-width="1.5" fill="none" marker-end="url(#git_arrow)"/>
  <text x="485" y="178" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle">4. Reconcile</text>
</svg>

---

## Release Controls: Sync Waves and Rollbacks

Deploying microservices requires precise ordering (e.g. databases must compile and run migrations before web APIs deploy). GitOps supports scheduling using **Sync Waves**. Resources are assigned a numeric wave weight. The agent applies all resources in wave 1, validates their health status, and only proceeds to wave 2 once the preceding phase is confirmed healthy.

### Rollbacks

If a bad configuration is deployed, standard practices bypass pipeline jobs to manually patch servers. Under a GitOps model, rolling back is as simple as reverting the git commit. 

The developer runs `git revert <commit-id>` and pushes the changes. The agent detects the new commit (which has reverted to the previous healthy state), triggers a reconciliation sync, and rollbacks the live resources within minutes.

---

## Further Reading

* [ArgoCD Documentation](https://argo-cd.readthedocs.io/) — Official setup guides, application spec configurations, and sync wave parameters
* [Mozilla SOPS GitHub Portal](https://github.com/getsops/sops) — SOPS usage rules, encryption workflows, and KMS integration guides
* [OpenGitOps principles](https://opengitops.dev/) — The community standards and definition specifications for Declarative GitOps loops
