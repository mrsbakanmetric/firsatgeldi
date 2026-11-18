// EmailSentBlock (pagedesign.md §5 [DECIDED 2026-11-18], product_design_pattern.md §5.13):
// after an e-mail link was sent (sign-up verification, forgot password, a new link):
// mail icon, title, text with the masked address, the spam-folder hint, then
// "Tekrar gönder" (with its countdown while it waits) and "Girişe dön".
import { Mail } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export interface EmailSentBlockProps {
  title: string;
  /** Sentence before the address ("Hesabını açmak için şu adrese …"). */
  text: string;
  emailMasked: string;
  spamHint: string;
  /** "Tekrar gönder" (or "Tekrar gönder · 0:58" while waiting). */
  resend: ReactNode;
  /** "Girişe dön". */
  back: ReactNode;
  /** One line after a resend ("Yeni bağlantıyı gönderdik"), else nothing. */
  notice?: ReactNode;
}

export function EmailSentBlock({ title, text, emailMasked, spamHint, resend, back, notice }: EmailSentBlockProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="flex size-(--size-thumb-sm) items-center justify-center rounded-pill bg-primary-subtle text-on-primary-subtle">
        <Icon icon={Mail} size="lg" />
      </span>
      <h2 className="text-h2 text-text">{title}</h2>
      <p className="text-body-sm text-text-muted">
        {text} <strong className="font-semibold text-text">{emailMasked}</strong>
      </p>
      <span className="text-caption text-text-muted">{spamHint}</span>
      {notice}
      <div className="flex flex-wrap justify-center gap-2">
        {resend}
        {back}
      </div>
    </div>
  );
}
