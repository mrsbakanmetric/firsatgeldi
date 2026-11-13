import { LOCALE_COOKIE } from "@firsatgeldi/i18n";
import { NextResponse, type NextRequest } from "next/server";
import { routeRequest } from "./lib/i18n/route-request";

export function proxy(request: NextRequest) {
  const decision = routeRequest({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    cookieLocale: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });

  if (decision.action === "redirect") {
    const response = NextResponse.redirect(new URL(decision.location, request.url), decision.permanent ? 308 : 307);
    // The locale-less redirect depends on the visitor's language.
    if (!decision.permanent) response.headers.set("Vary", "Accept-Language, Cookie");
    return response;
  }
  if (decision.action === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: no Next.js internals, API routes or files with an extension.
  matcher: ["/((?!_next/|api/|.*\\.\\w+$).*)"],
};
