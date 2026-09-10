import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyableTicketIdProps {
  /**
   * The complete unique ID of the ticket to copy.
   */
  id: string;
  /**
   * Optional prefix to render before the truncated ID (defaults to '#').
   */
  prefix?: string;
  /**
   * Number of characters to display from the start of the ID (defaults to 8).
   * Pass 0 or undefined to display the full ID.
   */
  displayLength?: number;
  /**
   * Additional Tailwind or CSS class names.
   */
  className?: string;
}

/**
 * Renders a clickable ticket ID badge that copies the complete ticket ID to the clipboard.
 * Prevents event bubbling so clicking the ID does not trigger parent card/list actions.
 */
export const CopyableTicketId: React.FC<CopyableTicketIdProps> = ({
  id,
  prefix = '#',
  displayLength = 8,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const displayText = displayLength && id.length > displayLength
    ? `${prefix}${id.slice(0, displayLength)}`
    : `${prefix}${id}`;

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = id;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy ticket ID to clipboard:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Ticket ID copied!' : `Click to copy ID (${id})`}
      aria-label={copied ? 'Ticket ID copied to clipboard' : `Copy ticket ID ${id}`}
      className={`group/tid inline-flex items-center gap-1 font-mono font-semibold transition-all rounded px-1 py-0.5 -mx-1 -my-0.5 cursor-pointer outline-none select-none active:scale-95 ${
        copied
          ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
          : 'text-[#0084ff] hover:text-[#38bdf8] hover:bg-[#0084ff]/15 border border-transparent'
      } ${className}`}
    >
      <span>{displayText}</span>
      {copied ? (
        <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0 animate-in zoom-in duration-150" />
      ) : (
        <Copy className="w-2.5 h-2.5 opacity-0 group-hover/tid:opacity-80 transition-opacity shrink-0 text-slate-400 group-hover/tid:text-[#38bdf8]" />
      )}
    </button>
  );
};
