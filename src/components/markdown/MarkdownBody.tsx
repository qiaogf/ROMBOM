import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";

/**
 * Site Markdown renderer
 *
 * Shared by /about, /terms and the admin preview, so preview output equals production.
 * Security: rehype-sanitize cleans user input first, then rehype-slug adds heading ids
 * (ids come from the plugin, not arbitrary user attributes). No dangerouslySetInnerHTML.
 * Note: react-markdown passes non-DOM props such as `node` to custom components, so only
 * the fields we need are forwarded to avoid leaking node="[object Object]" into the HTML.
 */

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-slate-600">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeSlug]}
        components={{
          h2: ({ children, id }) => (
            <h2
              id={id}
              className="mt-8 mb-3 text-2xl font-semibold text-emerald-800 scroll-mt-24 first:mt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="mt-6 mb-2 text-lg font-semibold text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-4 leading-7">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-emerald-700">{children}</strong>
          ),
          a: ({ children, href, title }) => (
            <a
              href={href}
              title={title}
              className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-1.5 pl-5 leading-7">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-1.5 pl-5 leading-7">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-emerald-600 bg-emerald-50/60 px-4 py-2 text-slate-700">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-slate-200" />,
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse border border-slate-300 text-left">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-300 px-3 py-2 align-top">{children}</td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
