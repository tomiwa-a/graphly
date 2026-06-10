import { BookOpen } from "lucide-react";

const footerLinks = [
  {
    title: "Learn",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/paths", label: "Learning Paths" },
      { href: "/concepts", label: "Concepts" },
      { href: "/exercises", label: "Exercises" },
    ],
  },
  {
    title: "Languages",
    links: [
      { href: "/languages/go", label: "Go" },
      { href: "/languages/typescript", label: "TypeScript" },
      { href: "/languages/python", label: "Python" },
      { href: "/languages/csharp", label: "C#" },
      { href: "/languages/java", label: "Java" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Graphy" },
      { href: "https://github.com/your-org/graphy", label: "GitHub" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
              <BookOpen className="h-5 w-5" />
              Graphy
            </a>
            <p className="mt-2 text-sm text-foreground-secondary">
              Backend engineering knowledge graph. Learn concepts, connections, and implementations.
            </p>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-foreground-muted">
          Graphy — Open source backend engineering knowledge graph.
        </div>
      </div>
    </footer>
  );
}
