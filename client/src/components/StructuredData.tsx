import { useEffect } from "react";

/**
 * Injects JSON-LD structured data into <head> for Google rich results.
 * Use on the Home page to describe the application and organization.
 */

interface StructuredDataProps {
  /** JSON-LD data object — must be valid Schema.org */
  data: Record<string, unknown>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    script.id = "structured-data-jsonld";

    // Remove any existing structured data script first
    const existing = document.getElementById("structured-data-jsonld");
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data]);

  return null;
}

/**
 * Pre-built structured data for the Jadoo 2.0 home page.
 * Combines WebApplication + Organization schemas.
 */
export const HOME_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Jadoo 2.0",
      url: "https://jadoo2.com",
      description:
        "AI-powered study assistant that helps students learn smarter with flashcards, quizzes, document summarization, AI chat, and personalized study plans.",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan available",
      },
      featureList: [
        "AI Chat Assistant",
        "Document Summarization",
        "Flashcard Generator",
        "Quiz Mode",
        "Study Planner",
        "Code Generator",
      ],
      screenshot: "https://jadoo2.com/og-image.png",
    },
    {
      "@type": "Organization",
      name: "Jadoo 2.0",
      url: "https://jadoo2.com",
      logo: "https://jadoo2.com/favicon.png",
      sameAs: [
        "https://x.com/Dipendrasah76",
        "https://www.linkedin.com/in/dipendra-kumar-b077b9286/",
        "https://github.com/Dipendra2003",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://jadoo2.com/contact",
      },
    },
    {
      "@type": "WebSite",
      name: "Jadoo 2.0",
      url: "https://jadoo2.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://jadoo2.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
};
