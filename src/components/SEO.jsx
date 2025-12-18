
import { useEffect } from "react";
import { BRAND } from "@/components/brand";

function setMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

function setLink(rel, href, extra = {}) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
}

function setScriptOfType(id, type, json) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = type;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json, null, 0);
}

export default function SEO({
  title,
  description,
  keywords,
  image,
  language = "de",
}) {
  useEffect(() => {
    try {
      const pageTitle = title || BRAND.name;
      const pageDesc = description || "Smarte Widerspruchsbriefe: Schnell, rechtssicher und verständlich – mit Paragraphen‑Heini.";
      const img = image || BRAND.logoUrl;
      const url = typeof window !== "undefined" ? window.location.href : "";
      const siteName = BRAND.name;

      // Title
      document.title = pageTitle;

      // Basic meta
      setMeta("description", pageDesc);
      if (keywords) setMeta("keywords", keywords);
      setMeta("robots", "index,follow");
      setMeta("language", language);

      // Canonical
      if (url) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement("link");
          link.setAttribute("rel", "canonical");
          document.head.appendChild(link);
        }
        link.setAttribute("href", url);
      }

      // Favicon + Touch icon
      setLink("icon", img, { type: "image/png" });
      setLink("shortcut icon", img, { type: "image/png" });
      setLink("apple-touch-icon", img);
      setMeta("theme-color", "#000000"); // korrekt: name="theme-color" content="#000000"

      // Open Graph (WhatsApp, FB)
      setMeta("og:title", pageTitle, "property");
      setMeta("og:description", pageDesc, "property");
      setMeta("og:type", "website", "property");
      if (url) setMeta("og:url", url, "property");
      setMeta("og:site_name", siteName, "property");
      setMeta("og:image", img, "property");
      setMeta("og:image:secure_url", img, "property");
      setMeta("og:locale", language === "de" ? "de_DE" : language === "en" ? "en_GB" : language, "property");

      // Twitter Card
      setMeta("twitter:card", "summary_large_image");
      setMeta("twitter:title", pageTitle);
      setMeta("twitter:description", pageDesc);
      setMeta("twitter:image", img);

      // Structured data (Organization + Website)
      const org = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: (typeof window !== "undefined" && window.location.origin) ? window.location.origin : "",
        logo: img,
      };
      const webSite = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: (typeof window !== "undefined" && window.location.origin) ? window.location.origin : "",
        potentialAction: {
          "@type": "SearchAction",
          target: `${(typeof window !== "undefined" && window.location.origin) ? window.location.origin : ""}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      };
      setScriptOfType("ld-org", "application/ld+json", org);
      setScriptOfType("ld-website", "application/ld+json", webSite);
    } catch (e) {
      // Fail silently to avoid breaking page rendering
       
      console.warn("SEO init failed:", e);
    }
  }, [title, description, keywords, image, language]);

  return null;
}
