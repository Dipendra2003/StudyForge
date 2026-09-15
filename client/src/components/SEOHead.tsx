import { useEffect } from "react";

const SITE_NAME = "Jadoo 2.0";
const SITE_BRAND = "Jadoo 2.0 (StudyForge)";
const DEFAULT_DESCRIPTION =
  "Ace your exams with Jadoo 2.0 (StudyForge) — the #1 free AI study assistant. Generate smart flashcards from PDFs, create adaptive quizzes, summarize notes, and learn faster with Gemini AI.";
const DEFAULT_KEYWORDS =
  "AI study assistant, AI flashcard generator, AI quiz maker, AI document summarizer, study planner app, AI chat for students, code generator for students, best study app 2026, online study tool, AI learning platform, smart flashcards, spaced repetition app, AI tutor, exam preparation tool, AI homework helper, PDF summarizer AI, AI notes generator, personalized study plan, adaptive learning app, free AI study tool, StudyForge, Jadoo 2.0, Jadoo AI, Quizlet alternative free, Anki alternative AI, Chegg alternative free, active recall app, make flashcards from PDF, generate MCQs from text, college study app, CBSE study app, NEET preparation AI, JEE study assistant, USMLE study assistant";
const DEFAULT_OG_IMAGE = "/og-image.jpg";
const SITE_URL = "https://studyforge-rk4r.onrender.com";

interface SEOHeadProps {
  /** Page-specific title — auto-appended with " — Jadoo 2.0" */
  title: string;
  /** Meta description (aim for 120-160 characters) */
  description?: string;
  /** Keywords for search engines (comma separated) */
  keywords?: string;
  /** Canonical URL path, e.g. "/about" */
  path?: string;
  /** Open Graph type — defaults to "website" */
  ogType?: "website" | "article";
  /** Open Graph image URL — defaults to /og-image.jpg */
  ogImage?: string;
  /** Author name — defaults to "Dipendra Kumar" */
  author?: string;
  /** Set true for auth/private pages that should NOT be indexed */
  noIndex?: boolean;
}

/**
 * Lightweight SEO head manager.
 * Sets document.title and manages <meta> / <link> tags in <head>
 * without adding heavy dependencies.
 */
export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  path = "/",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  author = "Dipendra Kumar",
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title.includes(SITE_NAME) || title.includes("StudyForge") 
    ? title 
    : `${title} — ${SITE_NAME}`;
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
    setMeta("name", "keywords", keywords);
    setMeta("name", "author", author);
    setMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    );

    // --- Canonical ---
    setLink("canonical", canonicalUrl);

    // --- Open Graph ---
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImageUrl);
    setMeta("property", "og:image:secure_url", ogImageUrl);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", fullTitle);
    setMeta("property", "og:site_name", SITE_BRAND);
    setMeta("property", "og:locale", "en_US");

    // --- Twitter Card ---
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@Dipendrasah76");
    setMeta("name", "twitter:creator", "@Dipendrasah76");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImageUrl);
    setMeta("name", "twitter:image:alt", fullTitle);

    // Cleanup: reset to defaults on unmount
    return () => {
      document.title = `${SITE_BRAND} — #1 Free AI Study Assistant`;
    };
  }, [fullTitle, description, keywords, canonicalUrl, ogType, ogImageUrl, author, noIndex]);

  // This component renders nothing to the DOM
  return null;
}
