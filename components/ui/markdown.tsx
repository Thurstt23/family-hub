import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export function Markdown({ content }: { content: string }) {
  // Parse markdown
  const rawHtml = marked.parse(content, { async: false }) as string;
  
  // Sanitize
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt']
    }
  });

  return (
    <div 
      className="prose prose-sm max-w-none prose-p:text-ink prose-headings:text-ink"
      dangerouslySetInnerHTML={{ __html: cleanHtml }} 
    />
  );
}
