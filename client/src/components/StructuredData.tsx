import { useEffect } from "react";

/**
 * Injects JSON-LD structured data into <head> for Google rich results.
 * Supports WebApplication, Organization, FAQPage, BreadcrumbList, Product schemas.
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
    script.id = `structured-data-jsonld-${Math.random().toString(36).substring(2, 9)}`;

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data]);

  return null;
}

const BASE_URL = "https://studyforge-rk4r.onrender.com";

/**
 * Structured data for the Home page.
 * Combines WebApplication, Organization, WebSite, BreadcrumbList, and FAQPage.
 */
export const HOME_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${BASE_URL}/#webapp`,
      name: "Jadoo 2.0",
      alternateName: ["StudyForge", "Jadoo AI", "StudyForge AI"],
      url: BASE_URL,
      description:
        "Free AI-powered study assistant that helps students ace exams with smart flashcard generation, adaptive quizzes, PDF document summarization, AI chat tutoring, code generation, and personalized study plans — powered by Google Gemini AI.",
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Study & Exam Preparation Tool",
      operatingSystem: "All (Web Browser, Chrome, Safari, Firefox, Edge, iOS, Android, Windows, macOS, Linux)",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      softwareVersion: "2.0",
      inLanguage: "en",
      isAccessibleForFree: true,
      keywords:
        "AI study assistant, AI flashcard generator, AI quiz maker, AI document summarizer, study planner app, AI chat for students, code generator for students, best study app 2026, smart flashcards, spaced repetition app, Quizlet alternative free, Anki alternative AI, CBSE study app, NEET preparation AI, JEE study assistant",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "0",
        highPrice: "199",
        offerCount: "3",
        offers: [
          {
            "@type": "Offer",
            name: "Free Plan",
            price: "0",
            priceCurrency: "INR",
            description: "Free forever plan with AI chat, basic flashcards, document summarization, and quizzes",
          },
          {
            "@type": "Offer",
            name: "Plus Plan",
            price: "99",
            priceCurrency: "INR",
            description: "Unlimited AI Q&A, advanced flashcards, 20-page document summarization, and priority support",
          },
          {
            "@type": "Offer",
            name: "Pro Plan",
            price: "199",
            priceCurrency: "INR",
            description: "Unlimited document summarization, custom study plans with spaced repetition, and advanced analytics",
          },
        ],
      },
      featureList: [
        "AI Chat Assistant with Google Gemini AI",
        "Document & PDF Summarization",
        "Smart AI Flashcard Generator",
        "Adaptive Quiz Mode & MCQ Generator",
        "Spaced Repetition Review System",
        "Personalized AI Study Planner",
        "Multi-Language AI Code Generator",
        "Progress Analytics & Review Heatmaps",
        "Leaderboards & Achievements",
        "Daily Quiz of the Day",
        "Shareable Quiz Challenges",
        "Export Flashcards to PDF & DOCX",
      ],
      screenshot: `${BASE_URL}/og-image.jpg`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "520",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Jadoo 2.0 (StudyForge)",
      url: BASE_URL,
      logo: `${BASE_URL}/favicon.png`,
      sameAs: [
        "https://x.com/Dipendrasah76",
        "https://www.linkedin.com/in/dipendra-kumar-b077b9286/",
        "https://github.com/Dipendra2003/StudyForge",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: `${BASE_URL}/contact`,
        email: "dipendrak299@gmail.com",
        availableLanguage: ["English", "Hindi"],
      },
      founder: {
        "@type": "Person",
        name: "Dipendra Kumar",
        url: "https://portfolio-dipendra.vercel.app/",
        sameAs: [
          "https://x.com/Dipendrasah76",
          "https://github.com/Dipendra2003",
          "https://www.linkedin.com/in/dipendra-kumar-b077b9286/",
        ],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: "Jadoo 2.0",
      alternateName: "StudyForge",
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${BASE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Jadoo 2.0 (StudyForge)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jadoo 2.0 (StudyForge) is a free AI-powered study assistant that helps students learn faster with smart flashcards, adaptive quizzes, PDF document summarization, 24/7 AI chat tutoring, code generation, and personalized study plans — powered by Google Gemini AI.",
          },
        },
        {
          "@type": "Question",
          name: "Is Jadoo 2.0 free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Jadoo 2.0 provides a generous free plan with core features including AI chat, smart flashcard creation, document summarization, and quizzes. Premium plans start at just ₹99/month with student discounts available.",
          },
        },
        {
          "@type": "Question",
          name: "How does the AI flashcard generator work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Upload your study materials (PDF, Word docs, or notes), and Jadoo 2.0's AI automatically extracts key concepts, formulas, and definitions to generate question-and-answer flashcards. It integrates spaced repetition algorithms for optimal memory retention.",
          },
        },
        {
          "@type": "Question",
          name: "Is Jadoo 2.0 a good free alternative to Quizlet and Anki?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Unlike traditional flashcard tools, Jadoo 2.0 uses Google Gemini AI to generate flashcards automatically from your notes in seconds, includes adaptive quizzes, and provides 24/7 AI explanations when you don't understand an answer.",
          },
        },
        {
          "@type": "Question",
          name: "What subjects and competitive exams does Jadoo 2.0 support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jadoo 2.0 supports all subjects including Mathematics, Physics, Chemistry, Biology, Computer Science, Engineering, History, and Literature. It is tailored for college exams, CBSE, NEET, JEE Main, USMLE, SAT, and GRE preparation.",
          },
        },
        {
          "@type": "Question",
          name: "Can Jadoo 2.0 help with programming and coding homework?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Jadoo 2.0 features a dedicated AI Code Generator that supports Python, JavaScript, Java, C++, TypeScript, Go, Rust, and SQL, providing clean code snippets with step-by-step logic explanations.",
          },
        },
        {
          "@type": "Question",
          name: "How does spaced repetition help me study better?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Spaced repetition shows you cards just before your brain is about to forget them. By reviewing challenging concepts more frequently and mastered concepts less often, you achieve higher exam retention in half the study time.",
          },
        },
      ],
    },
  ],
};

/**
 * Structured data for the Pricing page.
 */
export const PRICING_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Jadoo 2.0 Study Assistant Subscriptions",
      description: "Affordable AI study plans for students. Free tier available, Plus at ₹99/mo, and Pro at ₹199/mo with student discounts.",
      brand: {
        "@type": "Brand",
        name: "Jadoo 2.0",
      },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: "0",
        highPrice: "199",
        offerCount: "3",
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
          {
            "@type": "Offer",
            name: "Plus",
            price: "99",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "199",
            priceCurrency: "INR",
            priceValidUntil: "2027-12-31",
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
        ],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Pricing",
          item: `${BASE_URL}/pricing`,
        },
      ],
    },
  ],
};

/**
 * Structured data for the About page.
 */
export const ABOUT_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${BASE_URL}/about#webpage`,
      name: "About Jadoo 2.0 (StudyForge)",
      url: `${BASE_URL}/about`,
      description: "Learn about Jadoo 2.0 (StudyForge), our mission to democratize education through Google Gemini AI, and founder Dipendra Kumar.",
      publisher: {
        "@type": "Organization",
        name: "Jadoo 2.0",
        url: BASE_URL,
      },
    },
    {
      "@type": "Person",
      name: "Dipendra Kumar",
      jobTitle: "Founder & Full-Stack Developer",
      url: "https://portfolio-dipendra.vercel.app/",
      sameAs: [
        "https://x.com/Dipendrasah76",
        "https://github.com/Dipendra2003",
        "https://www.linkedin.com/in/dipendra-kumar-b077b9286/",
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "About Us",
          item: `${BASE_URL}/about`,
        },
      ],
    },
  ],
};

/**
 * Structured data for the Help Center page.
 */
export const HELP_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "@id": `${BASE_URL}/help#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Jadoo 2.0?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jadoo 2.0 is an AI-powered study assistant that helps students learn more effectively with AI chat, document summarization, flashcards, quizzes, code generation, and study planning.",
          },
        },
        {
          "@type": "Question",
          name: "How do flashcards work with spaced repetition?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can create flashcards manually or generate them automatically with AI from your notes. The system uses spaced repetition to help you review cards at optimal intervals for maximum long-term memory retention.",
          },
        },
        {
          "@type": "Question",
          name: "What file formats can I upload for document summarization?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Currently you can upload PDF, TXT, DOC, and DOCX files. The AI analyzes the content and provides a comprehensive summary with key points and study takeaways.",
          },
        },
        {
          "@type": "Question",
          name: "Can I generate code in different programming languages?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! The Code Generator supports Python, JavaScript, Java, C++, TypeScript, Go, Rust, and more with step-by-step explanations.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Help Center",
          item: `${BASE_URL}/help`,
        },
      ],
    },
  ],
};

/**
 * Structured data for the Contact page.
 */
export const CONTACT_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": `${BASE_URL}/contact#webpage`,
      name: "Contact Jadoo 2.0 Support",
      url: `${BASE_URL}/contact`,
      description: "Contact the Jadoo 2.0 team for student support, questions, feedback, or bug reports.",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "dipendrak299@gmail.com",
        url: `${BASE_URL}/contact`,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Contact",
          item: `${BASE_URL}/contact`,
        },
      ],
    },
  ],
};

/**
 * Structured data for the Privacy Policy page.
 */
export const POLICY_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/privacy-policy#webpage`,
      name: "Privacy Policy — Jadoo 2.0 (StudyForge)",
      url: `${BASE_URL}/privacy-policy`,
      description:
        "Read the Jadoo 2.0 Privacy Policy. Learn how we collect, use, protect, and store your personal information when using our AI-powered study assistant.",
      isPartOf: {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
      },
      inLanguage: "en",
      datePublished: "2025-03-27",
      dateModified: "2026-09-15",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Privacy Policy",
          item: `${BASE_URL}/privacy-policy`,
        },
      ],
    },
  ],
};

/**
 * Structured data for the Terms of Service page.
 */
export const TERMS_PAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/terms#webpage`,
      name: "Terms of Service — Jadoo 2.0 (StudyForge)",
      url: `${BASE_URL}/terms`,
      description:
        "Review the Jadoo 2.0 Terms of Service, including user agreements, acceptable use policies, free account access, intellectual property, and content guidelines.",
      isPartOf: {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
      },
      inLanguage: "en",
      datePublished: "2025-03-27",
      dateModified: "2026-09-15",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Terms of Service",
          item: `${BASE_URL}/terms`,
        },
      ],
    },
  ],
};
