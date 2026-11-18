"use client";

// Pieces shared by the sign-in screens (design "8 Giriş" v2.1): the form card, the
// e-mail check, the live password rules, the soft-disabled primary with its reason,
// and what happens after a successful sign-in (session cached, back to `next`).
import { Email, type Me } from "@firsatgeldi/contracts";
import { passwordRules } from "@firsatgeldi/core";
import type { Translator } from "@firsatgeldi/i18n";
import { cn, type PasswordRule } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { apiQueryKey, useApiQuery } from "../../lib/api/hooks";

export function isEmail(value: string): boolean {
  return Email.safeParse(value).success;
}

/** The live rules with the minimum length from `GET /auth/policy`. */
export function ruleList(t: Translator, password: string, minLength: number): PasswordRule[] {
  const state = passwordRules(password, minLength);
  return [
    { id: "length", text: t("auth.rules.length", { count: minLength }), met: state.length },
    { id: "letter", text: t("auth.rules.letter"), met: state.letter },
    { id: "digit", text: t("auth.rules.digit"), met: state.digit },
  ];
}

/** The numbers the screens show (password minimum, resend wait, gift, terms version). */
export function useAuthPolicy() {
  return useApiQuery("getAuthPolicy", {}, { staleTime: Number.POSITIVE_INFINITY }).data?.data ?? null;
}

/**
 * A primary that is not ready keeps its focus and says why (design §4.2: never a silent
 * disabled button): `aria-disabled` + the reason linked to it; pressing it shows the field errors.
 */
export function softDisabled(notReady: boolean, reasonId: string) {
  return notReady
    ? { "aria-disabled": true as const, "aria-describedby": reasonId, className: "w-full cursor-not-allowed opacity-(--component-button-disabled-opacity)" }
    : { className: "w-full" };
}

/** After SIGNED_IN: the session is known at once (no "Giriş yap" flash), other reads refresh, then back to `next`. */
export function useFinishSignIn() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (me: Me, next: string | null) => {
    queryClient.setQueryData(apiQueryKey("getMe", {}), { data: me, meta: undefined });
    void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "getMe" && query.queryKey[0] !== "getAuthPolicy" });
    if (next) router.replace(next);
  };
}

/** The white card the forms sit in (form column and link pages). */
export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-md", className)}>{children}</div>;
}

/** Link pages (new password, verified, expired link): one card in the middle of AuthShell. */
export function LinkPageFrame({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-(--size-side-panel-width) flex-col gap-4 px-4 py-8 md:py-12">{children}</div>;
}

/** Placeholder provider marks of the canvas until the official assets are added (build_status.md). */
export function ProviderMark({ letter }: { letter: string }) {
  return <span className="flex size-(--size-icon-lg) items-center justify-center rounded-sm bg-surface-alt text-body-sm font-bold text-text">{letter}</span>;
}
