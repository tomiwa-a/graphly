## Markdown Features Demo

This file exercises all the markdown features available in Graphy's renderer.

## Text Formatting

**Bold text** and *italic text* and ***bold italic***. You can also use `inline code` with backticks.

## Links and Images

Links work like [this link to Google](https://google.com). Images use the standard markdown syntax.

## Blockquotes

> This is a standard blockquote. It should render with a left border and italic styling.
>
> Multi-line blockquotes are supported too.

## Admonitions

> [!NOTE]
> This is a note admonition. Use it for general information that users should be aware of.

> [!TIP]
> This is a tip admonition. Use it for helpful advice and best practices.

> [!WARNING]
> This is a warning admonition. Use it for important caveats and potential pitfalls.

> [!CAUTION]
> This is a caution admonition. Use it for serious consequences and dangerous operations.

## Lists

### Unordered

- Item one
- Item two
- Item three
  - Nested item
  - Another nested item

### Ordered

1. First step
2. Second step
3. Third step
   1. Sub-step A
   2. Sub-step B

## Code Blocks

### JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result); // 55
```

### TypeScript

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

### Go

```go
package main

import (
    "fmt"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}
```

### Python

```python
from dataclasses import dataclass
from typing import List


@dataclass
class Task:
    id: int
    title: str
    completed: bool = False


class TaskManager:
    def __init__(self) -> None:
        self.tasks: List[Task] = []
        self._next_id = 1

    def add(self, title: str) -> Task:
        task = Task(id=self._next_id, title=title)
        self.tasks.append(task)
        self._next_id += 1
        return task
```

### SQL

```sql
SELECT
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 10;
```

### Bash

```bash
#!/bin/bash
# Deploy script

set -euo pipefail

APP_NAME="graphy"
REGION="us-east-1"

echo "Building $APP_NAME..."
npm run build

echo "Deploying to $REGION..."
aws s3 sync out/ "s3://$APP_NAME-prod/" --delete
aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --paths "/*"

echo "Done!"
```

## Tables

| Method | Path          | Status | Description          |
|--------|---------------|--------|----------------------|
| GET    | /users        | 200    | List all users       |
| POST   | /users        | 201    | Create a user        |
| GET    | /users/:id    | 200    | Get user by ID       |
| PUT    | /users/:id    | 200    | Update a user        |
| DELETE | /users/:id    | 204    | Delete a user        |

## Citations

Citations are defined in the YAML frontmatter and rendered separately. This is a citation placeholder — citations render as a card section at the bottom of the page.

## Mixed Content

Here is a paragraph with **bold**, *italic*, `code`, and a [link](https://example.com) all in one sentence.

> [!TIP]
> You can combine admonitions with **inline formatting** and `code references` inside them.
>
> ```javascript
> // Code inside an admonition
> console.log("this works");
> ```

| Feature      | Status | Notes                     |
|--------------|--------|---------------------------|
| Bold/Italic  | ✅     | Standard markdown         |
| Code blocks  | ✅     | Syntax highlighted        |
| Tables       | ✅     | GFM tables                |
| Admonitions  | ✅     | NOTE, TIP, WARNING, CAUTION |
| Lists        | ✅     | Ordered and unordered     |
| Blockquotes  | ✅     | Standard blockquotes      |
| Links        | ✅     | External links            |
