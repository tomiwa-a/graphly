---
title: Vector Databases
slug: vector-databases
summary: "Explore the mathematics of high-dimensional spaces, metric calculations, and indexing designs like HNSW and Product Quantization that power vector databases."
difficulty: advanced
chapterId: databases
domain: Databases
estimatedMinutes: 15
prerequisites: [indexes, hash-functions]
related: [lsm-trees]
seo_title: "Vector Databases: HNSW, Vector Indexing, and Search | Graphly"
seo_description: "Learn how vector databases handle high-dimensional float arrays. Deep dive into distance metrics, ANN search, HNSW graphs, and Product Quantization."
canonical_url: "/concepts/vector-databases"
citations:
  - title: "Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs"
    author: "Yu A. Malkov and D. A. Yashunin"
    chapter: "IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI)"
    page_range: "824-835"
    external_link: "https://ieeexplore.ieee.org/document/8308264"
  - title: "Product Quantization for Nearest Neighbor Search"
    author: "Herve Jegou, Matthijs Douze, and Cordelia Schmid"
    chapter: "IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI)"
    page_range: "117-128"
    external_link: "https://ieeexplore.ieee.org/document/5432202"
code_examples:
  - language: python
    title: HNSW Greedy Graph Search and Vector Distance Metrics
    code: |
      import numpy as np

      # Distance Metrics Calculations
      def L2_distance(v1: np.ndarray, v2: np.ndarray) -> float:
          """Euclidean (L2) distance formula."""
          return float(np.linalg.norm(v1 - v2))

      def cosine_distance(v1: np.ndarray, v2: np.ndarray) -> float:
          """Cosine distance derived from similarity."""
          dot_product = np.dot(v1, v2)
          norm_v1 = np.linalg.norm(v1)
          norm_v2 = np.linalg.norm(v2)
          if norm_v1 == 0 or norm_v2 == 0:
              return 1.0  # Maximum distance
          similarity = dot_product / (norm_v1 * norm_v2)
          return float(1.0 - similarity)

      class HNSWNode:
          def __init__(self, node_id: int, vector: np.ndarray):
              self.node_id = node_id
              self.vector = vector
              # Maps layer index to a list of neighboring node IDs
              self.neighbors = {}

      class SimpleHNSW:
          """A mock multi-layer HNSW graph simulator."""
          def __init__(self):
              self.nodes = {}
              self.num_layers = 3

          def add_node(self, node_id: int, vector: np.ndarray):
              self.nodes[node_id] = HNSWNode(node_id, vector)

          def add_edge(self, layer: int, u: int, v: int):
              if layer not in self.nodes[u].neighbors:
                  self.nodes[u].neighbors[layer] = []
              if layer not in self.nodes[v].neighbors:
                  self.nodes[v].neighbors[layer] = []
              self.nodes[u].neighbors[layer].append(v)
              self.nodes[v].neighbors[layer].append(u)

          def greedy_search(self, query: np.ndarray, entry_point_id: int, layer: int) -> int:
              """Greedy routing: moves to the closest neighbor in the layer."""
              curr_id = entry_point_id
              curr_dist = L2_distance(query, self.nodes[curr_id].vector)
              
              while True:
                  changed = False
                  neighbors = self.nodes[curr_id].neighbors.get(layer, [])
                  for neighbor_id in neighbors:
                      dist = L2_distance(query, self.nodes[neighbor_id].vector)
                      if dist < curr_dist:
                          curr_dist = dist
                          curr_id = neighbor_id
                          changed = True
                  # If no neighbor is closer than the current node, we reached a local minimum
                  if not changed:
                      break
              return curr_id

          def search(self, query: np.ndarray, entry_point_id: int) -> int:
              """Routes the query from the top sparse layer down to dense Layer 0."""
              curr_id = entry_point_id
              for layer in reversed(range(self.num_layers)):
                  curr_id = self.greedy_search(query, curr_id, layer)
                  print(f"Layer {layer} routing converged at Node {curr_id}")
              return curr_id

      # Example Usage
      if __name__ == "__main__":
          hnsw = SimpleHNSW()
          
          # Initialize nodes with mock 2D vectors
          hnsw.add_node(0, np.array([1.0, 1.0]))  # A
          hnsw.add_node(1, np.array([5.0, 5.0]))  # B
          hnsw.add_node(2, np.array([3.0, 3.0]))  # C
          hnsw.add_node(3, np.array([4.0, 4.0]))  # D
          hnsw.add_node(4, np.array([4.2, 4.2]))  # G (Target closest to Query)

          # Define multi-layer connections
          # Layer 2 (Top Sparse Layer)
          hnsw.add_edge(2, 0, 1)

          # Layer 1 (Medium Density Layer)
          hnsw.add_edge(1, 0, 2)
          hnsw.add_edge(1, 2, 3)
          hnsw.add_edge(1, 3, 1)

          # Layer 0 (Dense Bottom Layer)
          hnsw.add_edge(0, 0, 2)
          hnsw.add_edge(0, 2, 3)
          hnsw.add_edge(0, 3, 4)
          hnsw.add_edge(0, 4, 1)

          # Run Search with Query closest to G
          query_vector = np.array([4.3, 4.4])
          entry_node_id = 0
          
          print("Query Vector:", query_vector)
          nearest_id = hnsw.search(query_vector, entry_node_id)
          print("Nearest Node Found:", nearest_id, "Vector:", hnsw.nodes[nearest_id].vector)
---

## The Concept

Traditionally, databases indexed simple, scalar data types: integers, strings, dates, and booleans. Finding a record required matches using structures like B+ Trees.

However, artificial intelligence and machine learning models analyze unstructured data: text documents, raw images, audio clips, and video streams. To process this unstructured data, models convert it into **dense vectors** (embeddings). An embedding is a high-dimensional array of floating-point numbers, representing the semantic meaning of the source object.

Searching for semantically similar items requires a database that can query high-dimensional spaces. Standard B+ Trees or Hash indexes cannot search these spaces. This requirement led to the development of the **Vector Database**.

---

## High-Dimensional Vector Search

A vector database stores arrays of numbers representing items. The dimensionality of these arrays is high, often ranging from 128 to over 1,536 elements.

To determine if two items are semantically similar, the database calculates the mathematical distance between their embeddings.

### Distance Metrics Formulas
* **Euclidean Distance (L2)**: Measures the straight-line distance between two points in Euclidean space:

  L2 = &radic; &Sigma; (u<sub>i</sub> - v<sub>i</sub>)<sup>2</sup>

* **Cosine Similarity**: Measures the cosine of the angle between two vectors, evaluating their directional alignment rather than their absolute magnitude:

  Similarity = (u &middot; v) / (||u|| ||v||)

* **Dot Product**: Multiplies corresponding components of the vectors. If vectors are normalized to a length of 1, the dot product matches cosine similarity:

  Dot Product = &Sigma; u<sub>i</sub> &middot; v<sub>i</sub>

### The Dimensional Bottleneck
In a 2D or 3D space, dividing the space with trees (like KD-trees) is efficient. However, as the number of dimensions increases, KD-tree partition boundaries fail to prune irrelevant search spaces.

This performance drop is called the **curse of dimensionality**. In high dimensions, the distance between any two vectors converges: almost all vectors become equidistant from one another. This renders partitioning indexes useless, forcing queries to fallback to a brute-force full table scan. 

Running a brute-force scan requires calculating the distance between the query vector and every vector in the database. When storing millions of embeddings, this calculation is too slow.

---

## Approximate Nearest Neighbor (ANN) Indexing

To bypass the dimensional bottleneck, vector databases trade mathematical precision for query speed using **Approximate Nearest Neighbor (ANN)** indexing. ANN algorithms do not guarantee finding the absolute nearest neighbor, but they locate an approximate match with high probability in logarithmic time.

### Hierarchical Navigable Small World (HNSW) Graphs
The industry standard ANN index is the **Hierarchical Navigable Small World (HNSW)** graph. HNSW applies the skip-list data structure concept to a multi-layer graph model.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="22" fill="#88c0d0" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">HNSW Hierarchical Graph Routing</text>
  <rect x="20" y="45" width="540" height="60" rx="4" fill="#2e3440" stroke="#88c0d0" stroke-width="1.5" stroke-dasharray="3,3"/>
  <text x="35" y="62" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Layer 2 (Sparse Routing)</text>
  <circle cx="100" cy="80" r="6" fill="#3b4252" stroke="#eceff4" stroke-width="1.5"/>
  <text x="100" y="72" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Node A</text>
  <circle cx="480" cy="80" r="6" fill="#3b4252" stroke="#eceff4" stroke-width="1.5"/>
  <text x="480" y="72" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle">Node B</text>
  <line x1="106" y1="80" x2="474" y2="80" stroke="#81a1c1" stroke-width="1"/>
  <rect x="20" y="120" width="540" height="60" rx="4" fill="#2e3440" stroke="#eceff4" stroke-width="1" stroke-dasharray="2,2"/>
  <text x="35" y="137" fill="#eceff4" font-family="sans-serif" font-size="9" font-weight="bold">Layer 1 (Medium Density)</text>
  <circle cx="100" cy="155" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="220" cy="155" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="350" cy="155" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="480" cy="155" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <line x1="106" y1="155" x2="214" y2="155" stroke="#4c566a" stroke-width="1"/>
  <line x1="226" y1="155" x2="344" y2="155" stroke="#4c566a" stroke-width="1"/>
  <line x1="356" y1="155" x2="474" y2="155" stroke="#4c566a" stroke-width="1"/>
  <rect x="20" y="195" width="540" height="70" rx="4" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="35" y="212" fill="#a3be8c" font-family="sans-serif" font-size="9" font-weight="bold">Layer 0 (All Vectors - Dense)</text>
  <circle cx="100" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="160" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="220" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="290" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="350" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <circle cx="410" cy="235" r="6" fill="#3b4252" stroke="#a3be8c" stroke-width="2"/>
  <text x="410" y="225" fill="#a3be8c" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">G (Match)</text>
  <circle cx="480" cy="235" r="6" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <line x1="106" y1="235" x2="154" y2="235" stroke="#4c566a" stroke-width="1"/>
  <line x1="166" y1="235" x2="214" y2="235" stroke="#4c566a" stroke-width="1"/>
  <line x1="226" y1="235" x2="284" y2="235" stroke="#4c566a" stroke-width="1"/>
  <line x1="296" y1="235" x2="344" y2="235" stroke="#4c566a" stroke-width="1"/>
  <line x1="356" y1="235" x2="404" y2="235" stroke="#4c566a" stroke-width="1"/>
  <line x1="416" y1="235" x2="474" y2="235" stroke="#4c566a" stroke-width="1"/>
  <path d="M 80 80 Q 200 60 460 78" stroke="#bf616a" stroke-width="2" fill="none" stroke-dasharray="3,3" marker-end="url(#ar4)"/>
  <text x="280" y="66" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Step 1: Jump to closest (A -> B)</text>
  <path d="M 480 86 L 480 148" stroke="#bf616a" stroke-width="2" fill="none" stroke-dasharray="3,3" marker-end="url(#ar4)"/>
  <text x="490" y="125" fill="#bf616a" font-family="sans-serif" font-size="8">Step 2: Drop</text>
  <path d="M 474 155 L 356 155" stroke="#bf616a" stroke-width="2" fill="none" stroke-dasharray="3,3" marker-end="url(#ar4)"/>
  <text x="415" y="148" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Step 3: Route Left</text>
  <path d="M 350 161 L 350 228" stroke="#bf616a" stroke-width="2" fill="none" stroke-dasharray="3,3" marker-end="url(#ar4)"/>
  <text x="360" y="202" fill="#bf616a" font-family="sans-serif" font-size="8">Step 4: Drop</text>
  <path d="M 356 235 L 402 235" stroke="#bf616a" stroke-width="2" fill="none" stroke-dasharray="3,3" marker-end="url(#ar4)"/>
  <text x="380" y="247" fill="#bf616a" font-family="sans-serif" font-size="8" text-anchor="middle">Step 5: Final Converge</text>
  <defs>
    <marker id="ar4" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#bf616a"/>
    </marker>
  </defs>
  <line x1="100" y1="86" x2="100" y2="149" stroke="#4c566a" stroke-width="1" stroke-dasharray="2,2"/>
  <line x1="100" y1="161" x2="100" y2="229" stroke="#4c566a" stroke-width="1" stroke-dasharray="2,2"/>
  <line x1="480" y1="161" x2="480" y2="229" stroke="#4c566a" stroke-width="1" stroke-dasharray="2,2"/>
</svg>

In an HNSW index:
* **Layer 2 (Sparse Layer)**: Contains a sparse selection of vectors. Traversal hops across long distances to find the general neighborhood of the query.
* **Layer 1 (Medium Layer)**: Houses more vectors. Traversal performs finer local search adjustments.
* **Layer 0 (Dense Layer)**: Contains every vector in the index. The search performs small adjustments to identify the nearest neighbor.

This layered structure allows HNSW graphs to route queries in `O(log N)` search time.

---

## Vector Compression: Quantization

Storing millions of high-dimensional floating-point vectors in RAM requires significant memory. If each float requires 4 bytes, a 1536-dimensional vector requires 6KB of memory. Ten million vectors would require 60GB of RAM.

To reduce memory consumption, vector databases compress vectors using quantization:

* **Scalar Quantization (SQ)**: Translates floating-point numbers into 8-bit integers (int8). This reduces the memory footprint by 75% while retaining most of the vector's relative distance details.
* **Product Quantization (PQ)**: Divides a high-dimensional vector space into smaller sub-vectors, runs a clustering algorithm (like K-Means) to identify the centroids of these spaces, and represents each sub-vector as a 1-byte pointer to the nearest centroid. This compresses high-dimensional vectors by up to 95%, permitting massive datasets to fit in RAM at the cost of minor recall precision.

---

## Hybrid Search Filtering

Real-world applications rarely query vectors in isolation. Applications often pair semantic searches with specific metadata filters, such as:
> *"Find posts semantically similar to 'databases', but only those published in the last 24 hours by premium users."*

Vector databases coordinate this hybrid search using one of two execution paths:

### Pre-Filtering
The database first filters the dataset based on metadata criteria, leaving a small subset of candidate nodes. The engine then runs the vector search on this subset.
* **Problem**: If the metadata filter is restrictive (e.g. only 5 out of 100,000 documents match), the HNSW graph connections may be broken on those 5 nodes, preventing routing algorithms from finding the target vectors.

### Post-Filtering
The database first runs the vector search on the entire dataset to retrieve the top 100 candidates. It then discards candidates that fail the metadata criteria.
* **Problem**: If the metadata filter is restrictive, all top 100 vector candidates might be discarded, returning zero results to the user even though matching documents exist in the database.

To balance this trade-off, modern vector databases implement **Single-Stage Filtering**. This approach traverses the HNSW graph while evaluating metadata criteria on each step, pruning paths dynamically to ensure valid results are returned without breaking graph connectivity.

---

## Further Reading

* [The HNSW Paper](https://ieeexplore.ieee.org/document/8308264) — Yu A. Malkov's research introducing hierarchical navigable small world graphs.
* [Pinecone: What is a Vector Database?](https://www.pinecone.io/learn/vector-database/) — A primer on embeddings, distance metrics, and vector indexes.
* [Product Quantization for Similarity Search](https://mccormickml.com/2017/10/22/product-quantization/) — An illustrated explanation of product quantization concepts and code implementations.
