"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HighlightedCode } from "@/components/ui/highlighted-code";
import { Admonition } from "@/components/ui/admonition";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const code = String(children).replace(/\n$/, "");

            if (language) {
              return <HighlightedCode code={code} language={language} />;
            }

            return (
              <code
                className="rounded-md bg-surface-muted px-1.5 py-0.5 text-sm font-mono text-foreground before:content-none after:content-none"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          blockquote({ children }) {
            const childrenArray = (
              Array.isArray(children) ? children : [children]
            ).filter(Boolean);

            const firstChild = childrenArray[0] as
              | React.ReactElement
              | undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstProps = firstChild?.props as any;
            if (!firstChild || !firstProps?.children) {
              return (
                <blockquote className="my-4 border-l-4 border-border pl-4 italic text-foreground-secondary">
                  {children}
                </blockquote>
              );
            }

            const textContent =
              typeof firstProps.children === "string"
                ? firstProps.children
                : "";

            const match = textContent.match(/^\[!(\w+)\]/);
            if (!match) {
              return (
                <blockquote className="my-4 border-l-4 border-border pl-4 italic text-foreground-secondary">
                  {children}
                </blockquote>
              );
            }

            const type = match[1].toLowerCase();

            const cleanedChildren = childrenArray.map((child, i) => {
              if (i === 0 && typeof child === "object" && child !== null) {
                const cleaned = textContent.replace(/^\[!\w+\]\s*/, "");
                return <span key="cleaned">{cleaned}</span>;
              }
              return child;
            });

            return <Admonition type={type}>{cleanedChildren}</Admonition>;
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-border bg-surface-muted px-4 py-2.5 text-left text-xs font-bold font-heading text-foreground uppercase tracking-wider">
                {children}
              </th>
            );
          },
          tr({ children }) {
            return (
              <tr className="last:[&_td]:border-b-0 [&_td]:border-b [&_td]:border-border">
                {children}
              </tr>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2.5 text-sm text-foreground-secondary">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-dark underline decoration-primary-dark/30 underline-offset-2 hover:decoration-primary-dark transition-all"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="my-3 list-disc pl-6 text-foreground-secondary space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-3 list-decimal pl-6 text-foreground-secondary space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm leading-relaxed">{children}</li>;
          },
          p({ children }) {
            return <p className="text-base leading-relaxed text-foreground-secondary my-3">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
        }}
      />
    </div>
  );
}
