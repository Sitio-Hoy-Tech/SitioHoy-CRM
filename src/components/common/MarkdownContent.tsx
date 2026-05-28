"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="kb-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold text-heading mt-6 mb-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-heading mt-5 mb-2.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-heading mt-4 mb-2 first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-heading mt-3 mb-1.5">{children}</h4>,
          p: ({ children }) => <p className="text-sm text-body leading-relaxed mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-body pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-sm text-body pl-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-heading">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-accent/40 pl-4 py-1 my-3 bg-accent-soft rounded-r-lg text-sm text-muted italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <code className="block bg-elevated border border-edge rounded-lg px-4 py-3 text-xs font-mono text-heading overflow-x-auto leading-relaxed">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-elevated border border-edge rounded px-1.5 py-0.5 text-xs font-mono text-accent">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border border-edge rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-elevated border-b border-edge">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-edge last:border-0 hover:bg-elevated/50 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="text-left px-4 py-2.5 font-semibold text-heading text-xs uppercase tracking-wider">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2.5 text-body">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {children}
            </a>
          ),
          hr: () => <hr className="border-edge my-5" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
