"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

/**
 * Renders AI answers: markdown, GFM tables/lists, code blocks and LaTeX maths.
 * Kept as one client component so every surface renders answers identically.
 */
export const Markdown = React.memo(function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("prose-starvia", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, output: "html" }]]}
        components={{
          a: ({ href, children: linkChildren, ...props }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" {...props}>
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
