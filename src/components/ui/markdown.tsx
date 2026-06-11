"use client";

import { useEffect, useRef } from "react";

export function MarkdownRenderer({ content, initialHtml }: { content: string; initialHtml?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Copy Code button clicked
      if (target.classList.contains("copy-code-btn")) {
        const code = target.getAttribute("data-code");
        if (code) {
          navigator.clipboard.writeText(code).then(() => {
            const originalText = target.textContent || "Copy";
            target.textContent = "Copied!";
            const originalBg = target.style.backgroundColor;
            target.style.backgroundColor = "#10b981"; // success color
            target.style.color = "#ffffff";
            setTimeout(() => {
              target.textContent = originalText;
              target.style.backgroundColor = originalBg;
              target.style.color = "";
            }, 2000);
          });
        }
      }

      // Toggle Line Numbers button clicked
      if (target.classList.contains("toggle-line-numbers-btn")) {
        const containerBlock = target.closest(".code-block-container");
        const codeContent = containerBlock?.querySelector(".code-block-content");
        if (codeContent) {
          codeContent.classList.toggle("show-line-numbers");
        }
      }
    };

    container.addEventListener("click", handleContainerClick);
    return () => {
      container.removeEventListener("click", handleContainerClick);
    };
  }, []);

  const displayHtml = initialHtml || `<p class="text-foreground-secondary whitespace-pre-wrap">${content}</p>`;

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
}
