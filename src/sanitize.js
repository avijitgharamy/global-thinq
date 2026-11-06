import DOMPurify from "dompurify";
export function clean(html) {
  return DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
  });
}
