import { useEffect } from "react";

const SITE_NAME = "Jadoo 2.0";
const DEFAULT_DESCRIPTION =
  "Jadoo 2.0 is an AI-powered study assistant that helps you learn smarter with flashcards, quizzes, document summarization, AI chat, and personalized study plans.";
const DEFAULT_OG_IMAGE = "/og-image.png";
const SITE_URL = "https://jadoo2.com";

interface SEOHeadProps {
  /** Page-specific title — auto-appended with " — Jadoo 2.0" */
  title: string;
  /** Meta description (aim for 120-155 characters) */
  description?: string;
  /** Canonical URL path, e.g. "/about" */
  path?: string;
  /** Open Graph type — defaults to "website" */
  ogType?: "website" | "article";
  /** Open Graph image URL — defaults to /og-image.png */
  ogImage?: string;
  /** Set true for auth/private pages that should NOT be indexed */
  noIndex?: boolean;
}

/**
 * Lightweight SEO head manager.
 * Sets document.title and manages <meta> / <link> tags in <head>
 * without adding a dependency like react-helmet.
 */
export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${path}`;
  const ogImageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;

  useEffect(() => {
    // --- Title ---
    document.title = fullTitle;

    // --- Helper to set/create a <meta> tag ---
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // --- Helper to set/create a <link> tag ---
    const setLink = (rel: string, href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>(
        `link[rel="${rel}"]`
      );
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // --- Standard meta tags ---
    setMeta("name", "description", description);
    setMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large"
    );

    // --- Canonical ---
    setLink("canonical", canonicalUrl);

    // --- Open Graph ---
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImageUrl);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", fullTitle);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "en_US");

    // --- Twitter Card ---
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImageUrl);
    setMeta("name", "twitter:image:alt", fullTitle);

    // Cleanup: reset to defaults on unmount so next page can set its own
    return () => {
      document.title = SITE_NAME;
    };
  }, [fullTitle, description, canonicalUrl, ogType, ogImageUrl, noIndex]);

  // This component renders nothing to the DOM
  return null;
}
