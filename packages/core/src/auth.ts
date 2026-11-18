// Sign-in rules shared by the client and the API (modules.md Sign-in and Sign-up;
// product_design_pattern.md §5.18 masking). Pure functions, no platform code.

/**
 * Masked e-mail as shown on screens and in logs: first letter of the name and of the
 * domain, the rest hidden, the domain ending kept ("s***@o***.com"). Never the full address.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".");
  const ending = dot > 0 ? domain.slice(dot) : "";
  return `${local[0]}***@${domain[0]}***${ending}`;
}

/** Domain part of an e-mail, lower case: the only part of the address an activity row keeps. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  return at > 0 && at < email.length - 1 ? email.slice(at + 1).toLowerCase() : null;
}

export interface PasswordRuleState {
  /** At least `minLength` characters (`auth.password_min_length`). */
  readonly length: boolean;
  /** At least one letter (any alphabet, Turkish letters included). */
  readonly letter: boolean;
  /** At least one digit. */
  readonly digit: boolean;
}

/** The live password rules of sign-up and the new-password page [ASSUMPTION — rules, modules.md Sign-up]. */
export function passwordRules(password: string, minLength: number): PasswordRuleState {
  return {
    length: [...password].length >= minLength,
    letter: /\p{L}/u.test(password),
    digit: /\p{Nd}/u.test(password),
  };
}

export function passwordAccepted(password: string, minLength: number): boolean {
  const rules = passwordRules(password, minLength);
  return rules.length && rules.letter && rules.digit;
}
