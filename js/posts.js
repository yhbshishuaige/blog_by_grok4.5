/**
 * Blog posts API
 * Content is generated from posts/*.md by: npm run build
 * → js/posts.data.js
 * Private articles come from js/private.data.js: their display meta
 * (title/excerpt/tags/date) is public, but the body stays encrypted and is
 * only rendered after a successful unlock.
 */
import { posts as publicPosts } from "./posts.data.js";
import { privatePosts } from "./private.data.js";

function privateToPost(p) {
  return {
    slug: p.slug,
    title: p.title,
    tags: p.tags,
    date: p.date,
    excerpt: p.excerpt,
    lead: p.lead,
    wordCount: p.wordCount,
    readingMinutes: p.readingMinutes,
    private: true,
    content: "",
    toc: [],
    codeBlockCount: 0,
  };
}

export const posts = [...publicPosts, ...privatePosts.map(privateToPost)].sort(
  (a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.slug < b.slug ? -1 : 1;
  },
);

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
