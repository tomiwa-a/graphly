"use client";

import { useEffect, useRef, useState } from "react";

interface TocSection {
  id: string;
  title: string;
}

export function TableOfContents({ sections }: { sections: TocSection[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="hidden lg:block sticky top-24">
      <p className="text-xs font-bold tracking-[0.15em] text-foreground-secondary uppercase font-heading mb-4">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`block pl-4 py-1.5 text-sm font-sans transition-all duration-200 ${
                activeId === s.id
                  ? "text-primary-dark font-medium border-l-2 border-primary-dark -ml-px"
                  : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
