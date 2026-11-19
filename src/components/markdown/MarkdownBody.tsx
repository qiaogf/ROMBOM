import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";

/**
 * 站点 Markdown 渲染组件
 *
 * 前台 /about、/terms 与后台预览共用同一个组件，保证预览 = 线上。
 * 安全：rehype-sanitize 先清洗用户输入，rehype-slug 再为标题补 id
 * （id 由插件生成，不含用户任意属性），全程不使用 dangerouslySetInnerHTML。
 * 注意：react-markdown 会向自定义组件传入 node 等非 DOM 属性，这里只取需要的字段，
 * 不做全量透传，避免 node="[object Object]" 泄漏到 HTML。
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
