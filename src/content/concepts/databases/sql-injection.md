---
title: SQL Injection & Prevention
slug: sql-injection
summary: "Understand the mechanics of SQL Injection (SQLi) exploits and how Prepared Statements separate SQL logic from user input to secure database systems."
difficulty: beginner
chapterId: databases
domain: Databases
estimatedMinutes: 10
prerequisites: [indexes]
related: [rest-api-design]
seo_title: "SQL Injection Prevention: Prepared Statements and Security"
seo_description: "Learn how SQL Injection vulnerabilities occur and how to prevent them. Understand classic, blind, and union-based attacks, and the mechanics of parameterized queries."
canonical_url: "/concepts/sql-injection"
citations:
  - title: "A03:2021-Injection"
    author: "OWASP Foundation"
    chapter: "OWASP Top 10 Vulnerabilities Guide"
    page_range: "1-10"
    external_link: "https://owasp.org/Top10/A03_2021-Injection/"
  - title: "Advanced SQL Injection in SQL Server Applications"
    author: "Chris Anley"
    chapter: "NGSSoftware Insight Security Whitepaper"
    page_range: "1-22"
    external_link: "https://www.exploit-db.com/docs/english/17495-advanced-sql-injection-in-sql-server-applications.pdf"
code_examples:
  - language: python
    title: "Demonstrating SQL Injection Vulnerabilities and Prepared Statement Mitigations"
    code: |
      import sqlite3

      # Initialize an in-memory SQLite database for testing
      conn = sqlite3.connect(":memory:")
      cursor = conn.cursor()

      # Setup mock users table
      cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, secret_info TEXT)")
      cursor.execute("INSERT INTO users (username, password, secret_info) VALUES ('admin', 'secure_pass123', 'Flag: SQL_INJECTION_PRACTICE')")
      cursor.execute("INSERT INTO users (username, password, secret_info) VALUES ('bob', '12345', 'Bobs private notes')")
      conn.commit()

      def vulnerable_login(username_input, password_input):
          """
          Vulnerable implementation: Uses raw string concatenation.
          Allows attackers to inject SQL syntax commands.
          """
          # The query structure is compiled with the input directly
          query = f"SELECT * FROM users WHERE username = '{username_input}' AND password = '{password_input}'"
          print(f"Executing Vulnerable Query: {query}")
          
          cursor.execute(query)
          return cursor.fetchall()

      def secure_login(username_input, password_input):
          """
          Secure implementation: Uses parameterized queries (Prepared Statements).
          The database separates the query logic from the literal inputs.
          """
          query = "SELECT * FROM users WHERE username = ? AND password = ?"
          print(f"Executing Secure Query: {query} [Args: {username_input}, {password_input}]")
          
          cursor.execute(query, (username_input, password_input))
          return cursor.fetchall()

      if __name__ == "__main__":
          # 1. Natural user log in check:
          print("--- 1. Normal Login ---")
          res = secure_login("bob", "12345")
          print(f"Logged in user: {res}\n")

          # 2. SQL Injection attempt via string concatenation:
          # Using: ' OR '1'='1 as username bypasses the password condition completely.
          print("--- 2. Vulnerable Login under SQL Injection Attempt ---")
          attacker_input = "' OR '1'='1"
          res = vulnerable_login(attacker_input, "wrong_password")
          print(f"Vulnerable query results (Successful Bypass!): {res}\n")

          # 3. Running the same injection attempt on a secure parameterized query:
          print("--- 3. Secure Login under SQL Injection Attempt ---")
          res = secure_login(attacker_input, "wrong_password")
          print(f"Secure query results (Auth Neutralized): {res}")
          # The database searched for a literal username equal to: "' OR '1'='1" and found nothing.
          conn.close()
---

## The Problem: Merging Commands and Data

A major security vulnerability in web services is the confusion between **execution instructions** (code) and **user input** (data). When a backend service executes an operation by concatenating user strings directly into a database query string, it violates the code-data separation boundary.

This vulnerability is called **SQL Injection** (SQLi). 

If user inputs are appended directly to SQL queries, an attacker can input characters (such as single quotes `'` or comments `--`) that alter the structure of the SQL parser's syntax tree. This allows attackers to bypass authentication filters, retrieve confidential records, modify database tables, or execute remote system commands.

---

## The Mechanics of SQL Injection

To understand how SQLi works, consider a backend authentication routine:

```sql
SELECT * FROM users WHERE username = 'USER_INPUT' AND password = 'PASSWORD_INPUT';
```

If an attacker inputs the string `' OR '1'='1` as the username, the database engine parses the combined string:

```sql
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = 'PASSWORD_INPUT';
```

Because the `OR '1'='1'` condition is always true, the query parser evaluates the statement as true for every row in the table, bypassing the password validation check and returning all database profiles.

---

## SQL Injection Attack Variants

SQL injection exploits fall into three main categories based on how the attacker extracts data:

### 1. In-band SQLi (Classic)
The attacker uses the same channel to launch the attack and collect the results.
* **Union-based SQLi**: The attacker appends a `UNION` statement to the original query to merge results from another table (e.g. retrieving passwords from a `users` table via a public `products` search endpoint).
* **Error-based SQLi**: The attacker inputs strings that trigger deliberate database syntax errors, forcing the engine to display details (like column names or software versions) in the error logs returned to the user.

### 2. Blind SQLi
The database does not return results or errors on the screen, but the attacker can infer data by asking the database yes-or-no questions:
* **Boolean-based Blind SQLi**: The attacker injects queries that return different web page layouts depending on whether a condition evaluates to true or false.
* **Time-based Blind SQLi**: The attacker injects queries containing sleep functions (such as `PG_SLEEP(5)`). If the server takes five seconds longer to respond, the attacker confirms the condition is true.

### 3. Out-of-band SQLi
The attacker triggers database operations that transmit data over another protocol (such as DNS requests or HTTP queries) to a server they control.

---

## Secure Mitigation: Prepared Statements

The primary defense against SQL Injection is using **Prepared Statements** (also called Parameterized Queries):

<svg viewBox="0 0 580 260" xmlns="http://www.w3.org/2000/svg" style="background-color: var(--color-surface-muted, #1f2428); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; width: 100%;">
  <text x="290" y="20" fill="#88c0d0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">SQL Parsing: String Concat vs Prepared Statement</text>
  <rect x="15" y="45" width="260" height="190" rx="6" fill="#2e3440" stroke="#bf616a" stroke-width="1.5"/>
  <text x="145" y="65" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">1. Vulnerable (String Concat)</text>
  <text x="145" y="80" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle">Input: ' OR 1=1 --</text>
  <g transform="translate(35, 95)">
    <rect x="75" y="0" width="30" height="20" rx="3" fill="#bf616a" stroke="#d8dee9" stroke-width="1"/>
    <text x="90" y="13" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">OR</text>
    <path d="M 75 10 L 40 25" stroke="#eceff4" stroke-width="1" fill="none"/>
    <path d="M 105 10 L 140 25" stroke="#eceff4" stroke-width="1" fill="none"/>
    <rect x="5" y="25" width="60" height="20" rx="2" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="37" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">user = ''</text>
    <rect x="110" y="25" width="60" height="20" rx="2" fill="#bf616a" stroke="#eceff4" stroke-width="1"/>
    <text x="140" y="37" fill="#eceff4" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">1 = 1</text>
  </g>
  <text x="145" y="195" fill="#bf616a" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Bypasses authentication!</text>
  <text x="145" y="210" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Input modifies syntax structure.</text>
  <rect x="305" y="45" width="260" height="190" rx="6" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
  <text x="435" y="65" fill="#eceff4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">2. Secure (Prepared Statement)</text>
  <text x="435" y="80" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle">Input: ' OR 1=1 --</text>
  <g transform="translate(325, 95)">
    <rect x="75" y="0" width="30" height="20" rx="3" fill="#3b4252" stroke="#a3be8c" stroke-width="1"/>
    <text x="90" y="13" fill="#eceff4" font-family="sans-serif" font-size="9" text-anchor="middle">WHERE</text>
    <path d="M 75 10 L 40 25" stroke="#a3be8c" stroke-width="1" fill="none"/>
    <path d="M 105 10 L 140 25" stroke="#a3be8c" stroke-width="1" fill="none"/>
    <rect x="15" y="25" width="40" height="20" rx="2" fill="#3b4252" stroke="#4c566a" stroke-width="1"/>
    <text x="35" y="37" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">user</text>
    <rect x="110" y="25" width="70" height="20" rx="2" fill="#2e3440" stroke="#a3be8c" stroke-width="1.5"/>
    <text x="145" y="37" fill="#a3be8c" font-family="sans-serif" font-size="7" text-anchor="middle" font-weight="bold">' OR 1=1 --</text>
  </g>
  <text x="435" y="195" fill="#a3be8c" font-family="sans-serif" font-size="9" text-anchor="middle" font-weight="bold">Evaluated strictly as literal</text>
  <text x="435" y="210" fill="#d8dee9" font-family="sans-serif" font-size="8" text-anchor="middle">Cannot modify command syntax.</text>
</svg>

### Separating Syntax from Value
Prepared statements enforce a strict boundary between execution syntax and parameters. When a database prepares a query, it compiles the SQL template syntax tree *before* evaluating the input variables:

1. **COM_PREPARE**: The backend application sends a template query containing placeholders (like `?` or `$1`) to the database (e.g. `SELECT * FROM users WHERE username = ?`). The database compiles this SQL statement, builds the syntax tree, and optimizes the execution plan.
2. **COM_EXECUTE**: The application sends only the literal parameter values (e.g. `' OR '1'='1`) to the compiled template. The database inserts these values directly into the syntax leaf nodes as literal values. Because the query syntax structure is already fixed, the injection payload cannot modify the execution tree, neutralizing the attack.

---

## Defense in Depth Mitigations

While prepared statements prevent SQLi, backend systems should apply additional security layers to minimize risks:

* **Strict Input Validation**: Use type casting (e.g. casting incoming parameters to integers) and regular expression whitelists to validate fields before passing them to the database.
* **Principle of Least Privilege**: Run database connections using isolated accounts with restricted permissions. A web application account should only have `SELECT`, `INSERT`, and `UPDATE` permissions on specific tables, and should be blocked from calling administrative actions like `DROP TABLE` or accessing system configuration tables.
* **Web Application Firewalls (WAF)**: Deploy a WAF at network boundaries to analyze incoming payloads and block requests containing SQL injection patterns before they reach the web server.

---

## Further Reading

* [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) — Best practices for securing web applications against SQL injection across different programming frameworks.
* [Advanced SQL Injection in SQL Server Applications](https://www.exploit-db.com/docs/english/17495-advanced-sql-injection-in-sql-server-applications.pdf) — Chris Anley's whitepaper detailing database exploit structures and vulnerability paths.
* [Web Security Academy: SQL Injection](https://portswigger.net/web-security/sql-injection) — PortSwigger's interactive labs and tutorials for testing union-based and blind SQL injection vulnerabilities.
