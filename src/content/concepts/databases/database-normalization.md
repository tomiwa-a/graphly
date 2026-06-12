---
title: Database Normalization & Denormalization
slug: database-normalization
summary: "Learn how database normalization eliminates data anomalies using normal forms (1NF, 2NF, 3NF, BCNF) and how denormalization optimizes read performance in backend systems."
difficulty: beginner
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [indexes]
related: [sql-vs-nosql, sql-joins]
seo_title: "Database Normalization and Denormalization: 1NF, 2NF, 3NF, BCNF"
seo_description: "Deep dive into database normalization. Learn how functional dependencies, anomalies, and normal forms (1NF, 2NF, 3NF, BCNF) preserve integrity, and when to denormalize for performance."
canonical_url: "/concepts/database-normalization"
citations:
  - title: "A Relational Model of Data for Large Shared Data Banks"
    author: "E. F. Codd"
    chapter: "Communications of the ACM"
    page_range: "377-387"
    external_link: "https://dl.acm.org/doi/10.1145/362384.362685"
code_examples:
  - language: sql
    title: "Simulating Relational Anomalies in Un-normalized Tables and Corrective Schema Normalization"
    code: |
      -- 1. THE PROBLEM: A wide, un-normalized table containing repeating groups and transitive dependencies
      CREATE TABLE orders_unnormalized (
          order_id INT,
          customer_id INT,
          customer_name VARCHAR(100),
          items_csv VARCHAR(255), -- Non-atomic value containing multiple products
          supplier_id INT,
          supplier_country VARCHAR(100), -- Transitive dependency (supplier_id determines supplier_country)
          PRIMARY KEY (order_id)
      );

      INSERT INTO orders_unnormalized (order_id, customer_id, customer_name, items_csv, supplier_id, supplier_country)
      VALUES 
      (101, 1, 'Alice', 'Laptop, Mouse', 201, 'Japan'),
      (102, 2, 'Bob', 'Keyboard', 202, 'Germany');

      -- Relational anomalies in action:
      -- A. Update Anomaly: To update Bob's name, we must modify every order Bob has placed. If we miss one, data becomes inconsistent.
      -- B. Insertion Anomaly: We cannot insert a new supplier into the database without first registering an order.
      -- C. Deletion Anomaly: If we delete Order 102, we completely lose Bob's customer profile and Supplier 202's country.

      -- 2. THE SOLUTION: Normalizing to Third Normal Form (3NF)

      -- 1NF step: Ensure atomic values (no lists like 'Laptop, Mouse') and clear primary keys
      -- 2NF step: Remove partial key dependencies (split orders from customers/products)
      -- 3NF step: Remove transitive dependencies (split suppliers from products)

      -- Table A: Customers (1NF/2NF/3NF)
      CREATE TABLE customers (
          customer_id INT PRIMARY KEY,
          customer_name VARCHAR(100) NOT NULL
      );

      -- Table B: Suppliers (1NF/2NF/3NF)
      CREATE TABLE suppliers (
          supplier_id INT PRIMARY KEY,
          country VARCHAR(100) NOT NULL
      );

      -- Table C: Products (1NF/2NF/3NF)
      CREATE TABLE products (
          product_id INT PRIMARY KEY,
          product_name VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          supplier_id INT,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
      );

      -- Table D: Orders (1NF/2NF/3NF)
      CREATE TABLE orders (
          order_id INT PRIMARY KEY,
          customer_id INT,
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
      );

      -- Table E: Order Items (1NF/2NF/3NF) - Resolves repeating groups
      CREATE TABLE order_items (
          order_id INT,
          product_id INT,
          quantity INT NOT NULL,
          PRIMARY KEY (order_id, product_id),
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id)
      );

      -- Insert normalized records
      INSERT INTO customers (customer_id, customer_name) VALUES (1, 'Alice'), (2, 'Bob');
      INSERT INTO suppliers (supplier_id, country) VALUES (201, 'Japan'), (202, 'Germany');
      INSERT INTO products (product_id, product_name, price, supplier_id) VALUES 
      (501, 'Laptop', 1200.00, 201),
      (502, 'Mouse', 25.00, 201),
      (503, 'Keyboard', 75.00, 202);

      INSERT INTO orders (order_id, customer_id) VALUES (101, 1), (102, 2);
      INSERT INTO order_items (order_id, product_id, quantity) VALUES 
      (101, 501, 1),
      (101, 502, 1),
      (102, 503, 1);
---

## The Problem: Data Anomalies and Inconsistency

When designing a database schema, the way you group attributes into tables dictates how your application maintains data integrity over time. A naive, un-normalized table design that lumps customer profiles, product prices, order histories, and supplier locations into a single wide table causes structural bugs known as **relational anomalies**:

* **Update Anomaly**: If a customer changes their name, the application must locate and update every order row that customer has ever placed. If the network drops or a write fails halfway, the database enters an inconsistent state where the same customer has different names in different rows.
* **Insertion Anomaly**: If you want to insert a new product and its supplier details into the database, you cannot do so until a customer actually purchases the product, because the primary key requires an order ID.
* **Deletion Anomaly**: If a customer cancels their order, deleting that order row from the database also deletes the customer's email, name, and supplier's physical address, losing valuable business context.

To prevent these anomalies, relational database schemas are structured using a process called **normalization**.

---

## Normalization Steps and Normal Forms

Normalization systematically splits wide tables into smaller, cohesive tables linked by foreign key relationships. The process is governed by a series of rules called **normal forms**. Each normal form builds upon the rules of the previous one.

<svg viewBox="0 0 580 300" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Database Normalization: Schema Splits (1NF → 2NF → 3NF)</text>
  <rect x="15" y="45" width="165" height="230" rx="6" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="97" y="65" fill="#bf616a" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">Un-normalized Table</text>
  <text x="97" y="80" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Redundancy &amp; Anomalies</text>
  <rect x="25" y="95" width="145" height="135" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="35" y="115" fill="#eceff4" font-family="sans-serif" font-size="10">* OrderID (PK)</text>
  <text x="35" y="135" fill="#eceff4" font-family="sans-serif" font-size="10">  CustomerID</text>
  <text x="35" y="155" fill="#eceff4" font-family="sans-serif" font-size="10">  CustomerName</text>
  <text x="35" y="175" fill="#eceff4" font-family="sans-serif" font-size="10">  ProductID</text>
  <text x="35" y="195" fill="#eceff4" font-family="sans-serif" font-size="10">  ProductPrice</text>
  <text x="35" y="215" fill="#eceff4" font-family="sans-serif" font-size="10">  SupplierCountry</text>
  <text x="97" y="255" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">1NF: Flatten repeating lists</text>
  <path d="M 185 150 L 200 150" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arn1)"/>
  <rect x="205" y="45" width="170" height="230" rx="6" fill="#2e3440" stroke="#ebcb8b" stroke-width="1.5"/>
  <text x="290" y="65" fill="#ebcb8b" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">2NF (No Partial Key Dep)</text>
  <text x="290" y="80" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Split tables on functional keys</text>
  <rect x="215" y="95" width="150" height="65" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="225" y="110" fill="#a3be8c" font-family="sans-serif" font-size="9" font-weight="bold">Orders (OrderID is PK)</text>
  <text x="225" y="125" fill="#eceff4" font-family="sans-serif" font-size="9">* OrderID</text>
  <text x="225" y="140" fill="#eceff4" font-family="sans-serif" font-size="9">  CustomerID</text>
  <rect x="215" y="170" width="150" height="80" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="225" y="185" fill="#a3be8c" font-family="sans-serif" font-size="9" font-weight="bold">Products (ProductID is PK)</text>
  <text x="225" y="200" fill="#eceff4" font-family="sans-serif" font-size="9">* ProductID</text>
  <text x="225" y="215" fill="#eceff4" font-family="sans-serif" font-size="9">  ProductPrice</text>
  <text x="225" y="230" fill="#eceff4" font-family="sans-serif" font-size="9">  SupplierID (Transitive -> Country)</text>
  <path d="M 380 150 L 395 150" stroke="#88c0d0" stroke-width="2" fill="none" marker-end="url(#arn1)"/>
  <rect x="400" y="45" width="165" height="230" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="482" y="65" fill="#a3be8c" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">3NF (No Transitive Dep)</text>
  <text x="482" y="80" fill="#81a1c1" font-family="sans-serif" font-size="9" text-anchor="middle">Isolate transitive keys</text>
  <rect x="410" y="95" width="145" height="50" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="420" y="110" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Products (3NF)</text>
  <text x="420" y="125" fill="#eceff4" font-family="sans-serif" font-size="9">* ProductID | Price | SupplierID</text>
  <rect x="410" y="155" width="145" height="50" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="420" y="170" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Suppliers (3NF)</text>
  <text x="420" y="185" fill="#eceff4" font-family="sans-serif" font-size="9">* SupplierID | Country</text>
  <rect x="410" y="215" width="145" height="50" rx="3" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
  <text x="420" y="230" fill="#88c0d0" font-family="sans-serif" font-size="9" font-weight="bold">Orders (3NF)</text>
  <text x="420" y="245" fill="#eceff4" font-family="sans-serif" font-size="9">* OrderID | CustomerID</text>
  <defs>
    <marker id="arn1" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#88c0d0"/>
    </marker>
  </defs>
</svg>

### First Normal Form (1NF)
To satisfy 1NF, tables must contain only **atomic values**.
* **Atomic Values**: A column cannot store comma-separated list values, arrays, or nested records (e.g. storing `'Laptop, Mouse'` in a single `items` string column).
* **No Repeating Groups**: Multiple columns cannot store the same type of data (e.g. `item_1`, `item_2`, `item_3`). 
* **Primary Key**: A primary key must be defined to uniquely identify each row.

### Second Normal Form (2NF)
To satisfy 2NF, a table must be in 1NF, and all non-key columns must depend on the **entire primary key**.
* **Partial Dependency**: If a table has a composite primary key (e.g. `OrderID` + `ProductID`), but a non-key column like `CustomerEmail` depends only on `OrderID`, that column has a partial dependency. Under 2NF, attributes depending on only a subset of a composite primary key must be split out into their own tables.

### Third Normal Form (3NF)
To satisfy 3NF, a table must be in 2NF, and no non-key columns can depend on other non-key columns.
* **Transitive Dependency**: If $X \rightarrow Y$ (X determines Y) and $Y \rightarrow Z$ (Y determines Z), then $X \rightarrow Z$ is a transitive dependency. For example, if `ProductID` (X) determines `SupplierID` (Y), and `SupplierID` determines `SupplierCountry` (Z), then `SupplierCountry` has a transitive dependency on `ProductID`. Under 3NF, these transitively dependent attributes must be isolated into a separate table (e.g. a `suppliers` table).

### Boyce-Codd Normal Form (BCNF)
A strict version of 3NF, BCNF requires that for every functional dependency $X \rightarrow Y$, the determinant $X$ must be a **candidate key** (a column or set of columns that could serve as a primary key). BCNF resolves anomalies that occur in tables with multiple, overlapping composite candidate keys.

---

## Normalization Mathematics and Decomposition

Normalization is grounded in database theory through **functional dependencies**: if a value in column X uniquely determines a value in column Y, we write $X \rightarrow Y$. 

When spliting tables during normalization, the database engine must ensure:
* **Loss-less Join Decomposition**: Splitting table $R$ into tables $R_1$ and $R_2$ is lossless if joining them back together reconstruction produces the exact original records without introducing fake (spurious) rows. Mathematically, this requires that the intersection of $R_1$ and $R_2$ is a candidate key for at least one of the tables.
* **Dependency Preservation**: All functional dependencies defined on the original table must still be enforceable by applying constraints to individual normalized tables, preventing the need to join tables during write checks.

---

## Denormalization Trade-offs

While normalized schemas guarantee data integrity, they introduce performance costs.

* **Join Latency**: To display a customer checkout page, a 3NF schema requires joining `orders`, `order_items`, `customers`, `products`, and `suppliers` tables. As database sizes grow, executing complex multi-table joins uses significant CPU and memory.
* **Write Costs**: Updating normalized data is clean, but inserting a new business event requires writing to multiple tables, updating separate B-Tree indexes, and managing distributed transaction locks.

**Denormalization** is the process of selectively reintroducing redundancy into a normalized schema to speed up read operations. 

| Dimension | Normalization (3NF) | Denormalization |
| :--- | :--- | :--- |
| **Write Performance** | High (single-row updates, no duplicate syncs) | Low (must update multiple locations to prevent drift) |
| **Read Performance** | Low (requires resource-heavy joins) | High (direct queries on a single table) |
| **Storage Overhead** | Minimal (no duplicated data attributes) | High (redundant copies stored on disk) |
| **Data Integrity** | Enforced at database engine schema level | Requires application-level synchronization |

---

## Relational Views vs Materialized Views

Rather than altering the physical schema to denormalize, backend systems can utilize **views**:

### Relational Views
A standard view is a saved SQL query. When queried, it acts as a virtual table. The database engine executes the underlying query on the fly, performing necessary joins. 
* **Benefit**: Views simplify queries for developers while maintaining normalized storage on disk. However, they do not improve performance because they execute the joins on every request.

### Materialized Views
A materialized view physically caches the query results on disk.
* **Benefit**: Reading from a materialized view is extremely fast because it bypasses the join queries. However, the data can become stale. Materialized views must be refreshed explicitly (e.g., in PostgreSQL using `REFRESH MATERIALIZED VIEW`) or updated dynamically through write triggers or database event loops.

---

## Further Reading

* [A Relational Model of Data for Large Shared Data Banks](https://dl.acm.org/doi/10.1145/362384.362685) — Edgar F. Codd's seminal 1970 paper introducing the relational database model and normalization concepts.
* [Database System Concepts](https://codex.cs.yale.edu/avi/db-book/) — Silberschatz, Korth, and Sudarshan's classic textbook, which covers relational design theory and functional dependencies in detail.
* [Materialized View Patterns](https://microservices.io/patterns/data/materialized-view.html) — Strategies for building read-optimized materialized views in high-scale microservice environments.
