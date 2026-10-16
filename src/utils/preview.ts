/**
 * The mock API stamps every body with a leading "Hi," paragraph and generates
 * `email.preview` independently of `email.body`. These helpers normalize what
 * we show in the UI without touching `src/api/`.
 */

/** Drop the boilerplate greeting — sender is already in the message header. */
export function displayBody(body: string): string {
  return body.replace(/^Hi,\s*\n*/, '').trimStart();
}

/** Inbox-row preview clipped from the real body (not the unrelated preview field). */
export function previewFromBody(body: string): string {
  const paragraphs = displayBody(body)
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  const snippet = (paragraphs[0] ?? '').trim();
  return snippet || displayBody(body).replace(/\s+/g, ' ').trim();
}
