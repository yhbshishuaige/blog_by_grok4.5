/**
 * Blog posts API
 * Content is generated from posts/*.md by: npm run build
 * → js/posts.data.js
 * Private articles (encrypted) come from js/private.data.js; only their
 * slug/metadata is exposed here — content requires a password to decrypt.
 */
import { posts as publicPosts } from "./posts.data.js";
import { privatePosts } from "./private.data.js";

export const posts = [
  ...publicPosts,
  ...privatePosts.map((p) => ({
    slug: p.slug,
    title: "私密文章",
    private: true,
    date: "",
  })),
];

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
