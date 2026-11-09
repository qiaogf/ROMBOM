"use client";

import { useEffect } from "react";

/**
 * 去除浏览器原生 title 提示（悬停时出现的黑底白字浮层）。
 * 挂载后清空现有节点的 title，并持续移除后续动态渲染出来的 title。
 */
export function NoNativeTooltip() {
  useEffect(() => {
    const strip = (root: ParentNode) => {
      root.querySelectorAll?.("[title]").forEach((el) => el.removeAttribute("title"));
      if (root instanceof Element && root.hasAttribute("title")) {
        root.removeAttribute("title");
      }
    };

    strip(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "title") {
          const el = mutation.target as Element;
          el.removeAttribute("title");
          continue;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) strip(node as Element);
        });
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
