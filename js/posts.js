/**
 * Blog posts API
 * Content is generated from posts/*.md by: npm run build
 * → js/posts.data.js
 */
export { posts } from "./posts.data.js";

import { posts } from "./posts.data.js";

export function getPostBySlug(slug) {
  return posts.find((p) => p.slug === slug) || null;
}

export function formatDate(iso) {
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
