"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, DifficultyBadge, DomainBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { CodeBlock } from "@/components/ui/code-block";
import { useState } from "react";
import { Info, ArrowRight, Search } from "lucide-react";

export default function ComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-foreground">Component Library</h1>
          <p className="text-sm text-foreground-secondary">Development showcase</p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        {/* Color Palette */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Color Palette</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { name: "Primary", class: "bg-primary" },
              { name: "Primary Dark", class: "bg-primary-dark" },
              { name: "Secondary", class: "bg-secondary" },
              { name: "Accent", class: "bg-accent" },
              { name: "Success", class: "bg-success" },
              { name: "Destructive", class: "bg-destructive" },
              { name: "Info", class: "bg-info" },
              { name: "Warning", class: "bg-warning" },
            ].map((c) => (
              <div key={c.name} className="rounded-xl border border-border p-4">
                <div className={`mb-2 h-16 rounded-lg ${c.class}`} />
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-foreground-muted">{c.class.replace("bg-", "")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Typography</h2>
          <div className="space-y-3 rounded-xl border border-border bg-surface-card p-6">
            <p className="text-4xl font-bold text-foreground">Heading XL</p>
            <p className="text-2xl font-bold text-foreground">Heading 2XL</p>
            <p className="text-xl font-semibold text-foreground">Heading XL</p>
            <p className="text-lg font-semibold text-foreground">Heading LG</p>
            <p className="text-base font-medium text-foreground">Body base</p>
            <p className="text-sm text-foreground-secondary">Body small (secondary)</p>
            <p className="text-xs text-foreground-muted">Caption (muted)</p>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Buttons</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Badges</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge level="beginner" />
              <DifficultyBadge level="intermediate" />
              <DifficultyBadge level="advanced" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DomainBadge domain="api-design" />
              <DomainBadge domain="databases" />
              <DomainBadge domain="caching" />
              <DomainBadge domain="queues" />
              <DomainBadge domain="auth" />
              <DomainBadge domain="reliability" />
              <DomainBadge domain="observability" />
              <DomainBadge domain="deployment" />
              <DomainBadge domain="foundations" />
            </div>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Cards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Just a simple card with title and description.</CardDescription>
            </Card>
            <Card hover>
              <CardHeader>
                <CardTitle>Hover Card</CardTitle>
                <Badge>New</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground-secondary">
                  This card lifts on hover. Great for clickable concept cards.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="ghost">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardTitle>Concept Card</CardTitle>
              <CardDescription>idempotency</CardDescription>
              <CardContent className="mt-3 flex gap-2">
                <DifficultyBadge level="intermediate" />
                <DomainBadge domain="api-design" />
                <DomainBadge domain="reliability" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Inputs</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-60">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Default</label>
              <Input placeholder="Search concepts..." />
            </div>
            <div className="w-60">
              <label className="mb-1.5 block text-sm font-medium text-foreground">With error</label>
              <Input error placeholder="Email address" />
            </div>
          </div>
        </section>

        {/* Select */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Select</h2>
          <div className="w-60">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Language</label>
            <Select placeholder="Select language" value="go">
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="csharp">C#</SelectItem>
              <SelectItem value="java">Java</SelectItem>
            </Select>
          </div>
        </section>

        {/* Avatars */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Avatars</h2>
          <div className="flex items-center gap-4">
            <Avatar fallback="T" size="sm" />
            <Avatar fallback="A" size="default" />
            <Avatar fallback="M" size="lg" />
            <Avatar src="" fallback="U" size="default" />
          </div>
        </section>

        {/* Tooltip */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Tooltips</h2>
          <Tooltip content="This is a helpful tooltip">
            <span className="cursor-help text-sm font-medium text-primary underline decoration-dashed">
              Hover me
            </span>
          </Tooltip>
        </section>

        {/* Dialog */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Dialog</h2>
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Confirm Action</Dialog.Title>
                <Dialog.Description>
                  This is a confirmation dialog. Are you sure you want to proceed?
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Footer>
                <Dialog.Close className="inline-flex items-center justify-center rounded-lg border border-input bg-surface-card px-4 text-sm font-medium h-10 shadow-button hover:bg-surface-hover transition-colors">
                  Cancel
                </Dialog.Close>
                <Button variant="primary">Confirm</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Root>
        </section>

        {/* Progress Bar */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Progress Bars</h2>
          <div className="w-full max-w-md space-y-4">
            <div>
              <p className="mb-1 text-sm text-foreground-secondary">25%</p>
              <ProgressBar value={25} />
            </div>
            <div>
              <p className="mb-1 text-sm text-foreground-secondary">50%</p>
              <ProgressBar value={50} size="default" showLabel />
            </div>
            <div>
              <p className="mb-1 text-sm text-foreground-secondary">75%</p>
              <ProgressBar value={75} size="lg" />
            </div>
            <div>
              <p className="mb-1 text-sm text-foreground-secondary">100%</p>
              <ProgressBar value={100} />
            </div>
          </div>
        </section>

        {/* Skeleton */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Skeletons</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-border bg-surface-card p-6">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </section>

        {/* CodeBlock */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Code Block</h2>
          <CodeBlock
            examples={[
              {
                language: "go",
                code: `func HandlePayment(w http.ResponseWriter, r *http.Request) {\n  idempotencyKey := r.Header.Get("Idempotency-Key")\n  if idempotencyKey == "" {\n    http.Error(w, "missing key", http.StatusBadRequest)\n    return\n  }\n  // ... process payment\n}`,
              },
              {
                language: "typescript",
                code: `async function handlePayment(req: Request) {\n  const idempotencyKey = req.headers.get("Idempotency-Key")\n  if (!idempotencyKey) {\n    return new Response("missing key", { status: 400 })\n  }\n  // ... process payment\n}`,
              },
              {
                language: "python",
                code: `async def handle_payment(request: Request):\n    idempotency_key = request.headers.get("Idempotency-Key")\n    if not idempotency_key:\n        return Response("missing key", status_code=400)\n    # ... process payment`,
              },
            ]}
          />
        </section>

        {/* Toasts */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-foreground">Toasts</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => toast.success("Concept marked as read!")}>
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error("Failed to save progress")}
            >
              Error toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info("New concept available")}
            >
              Info toast
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.warning("Prerequisites not completed")}
            >
              Warning toast
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
