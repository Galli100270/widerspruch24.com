import React from "react";
import ReactMarkdown from "react-markdown";

export default function LegalProse({ markdown }) {
  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="legal-prose prose prose-invert max-w-none">
        <ReactMarkdown
          components={{
            a: ({ children, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-200">
                {children}
              </a>
            ),
            h1: ({ children }) => <h1 className="text-3xl md:text-4xl font-bold mt-0 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-semibold mt-8 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-semibold mt-6 mb-2">{children}</h3>,
            p: ({ children }) => <p className="leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-6 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-6 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-white/20 pl-4 italic text-white/80">{children}</blockquote>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      <style>{`
        .legal-prose {
          line-height: 1.9;
          letter-spacing: 0.2px;
        }
        @media (max-width: 640px){
          .legal-prose { font-size: 0.98rem; }
        }
      `}</style>
    </div>
  );
}