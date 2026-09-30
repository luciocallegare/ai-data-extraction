export function sanitizeInput(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function truncateInput(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
