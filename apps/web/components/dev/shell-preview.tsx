"use client";

// Development-only shell preview [DECIDED 2026-11-14] (docs/implementation_plan.md
// step 8): every shell, template, component and the five states, in tr/en and
// light/dark, at phone and desktop width. Not part of the production build
// (next.config.ts › pageExtensions). Sample texts come from the "preview"
// catalogue section; sample numbers below are preview data only.
import { formatNumber, type ThemePreference } from "@firsatgeldi/core";
import type { Locale, TranslationKey } from "@firsatgeldi/i18n";
import {
  Avatar,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  Icon,
  Menu,
  PageTemplate,
  SegmentedChoice,
  Select,
  Sheet,
  SkeletonRow,
  StatusBanner,
  StepIndicator,
  Switch,
  TextField,
  type PageTemplateKind,
} from "@firsatgeldi/ui";
import { Bell, CirclePlus, Ellipsis, List, PackagePlus, RefreshCw, Trash2, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useThemePreference } from "../../lib/theme/use-theme-preference";
import { AdminShell } from "../shell/admin-shell";
import { AppShell } from "../shell/app-shell";
import { AuthShell } from "../shell/auth-shell";
import { useTranslator, type ShellViewer } from "../shell/parts";

type ShellKind = "app" | "auth" | "admin";
type ViewerKind = "user" | "guest" | "landing";

const SAMPLE_UNREAD = 3;
const SAMPLE_COUNTS = { all: 12, bought: 8, want: 3, deal: 2, ended: 1, electronics: 9, clothing: 3 };

export function ShellPreview({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const [shell, setShell] = useState<ShellKind>("app");
  const [viewerKind, setViewerKind] = useState<ViewerKind>("user");
  const [kind, setKind] = useState<PageTemplateKind>("list");
  const [theme, setTheme] = useThemePreference();

  const viewer: ShellViewer =
    viewerKind === "user" ? { kind: "user", initials: t("preview.initials"), unreadCount: SAMPLE_UNREAD, unreadDeal: true } : { kind: "guest" };
  const signOut = () => setViewerKind("guest");
  const bellPanel = (
    <div className="flex flex-col gap-3">
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );

  const controls = (
    <section aria-labelledby="preview-controls" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 id="preview-controls" className="text-h3 text-text">
        {t("preview.controls")}
      </h2>
      <Choice
        label={t("preview.shell")}
        value={shell}
        onChange={(value) => setShell(value as ShellKind)}
        options={[
          ["app", t("preview.shellApp")],
          ["auth", t("preview.shellAuth")],
          ["admin", t("preview.shellAdmin")],
        ]}
      />
      {shell === "app" && (
        <Choice
          label={t("preview.viewer")}
          value={viewerKind}
          onChange={(value) => setViewerKind(value as ViewerKind)}
          options={[
            ["user", t("preview.viewerUser")],
            ["guest", t("preview.viewerGuest")],
            ["landing", t("preview.viewerLanding")],
          ]}
        />
      )}
      <Choice
        label={t("preview.template")}
        value={kind}
        onChange={(value) => setKind(value as PageTemplateKind)}
        options={[
          ["list", t("preview.templateList")],
          ["detail", t("preview.templateDetail")],
          ["flow", t("preview.templateFlow")],
          ["summary", t("preview.templateSummary")],
          ["settings", t("preview.templateSettings")],
        ]}
      />
      <Choice
        label={t("preview.theme")}
        value={theme}
        onChange={(value) => setTheme(value as ThemePreference)}
        options={[
          ["system", t("preview.themeSystem")],
          ["light", t("preview.themeLight")],
          ["dark", t("preview.themeDark")],
        ]}
      />
    </section>
  );

  const page = (
    <PageTemplate
      kind={kind}
      title={t("preview.title")}
      caption={t("preview.caption")}
      actions={
        <>
          <Button variant="secondary">{t("preview.secondaryAction")}</Button>
          <Button>{t("preview.primaryAction")}</Button>
        </>
      }
      summary={kind === "summary" || kind === "list" ? <Region>{t("preview.regionSummary")}</Region> : undefined}
      toolbar={kind === "list" ? <Toolbar locale={locale} /> : undefined}
      sectionMenu={kind === "settings" ? <Region>{t("preview.regionMenu")}</Region> : undefined}
      side={kind === "settings" ? undefined : <Region tall>{t("preview.regionSide")}</Region>}
      sideLabel={t("preview.regionSide")}
      sections={kind === "detail" ? <Region>{t("preview.regionSections")}</Region> : undefined}
    >
      {controls}
      <States locale={locale} />
      <Components locale={locale} />
    </PageTemplate>
  );

  if (shell === "auth") return <AuthShell locale={locale}>{page}</AuthShell>;
  if (shell === "admin")
    return (
      <AdminShell locale={locale} section="overview" initials={t("preview.initials")} unreadCount={SAMPLE_UNREAD} bellPanel={bellPanel} onSignOut={() => setShell("app")}>
        {page}
      </AdminShell>
    );
  return (
    <AppShell locale={locale} viewer={viewerKind === "landing" ? { kind: "guest" } : viewer} variant={viewerKind === "landing" ? "landing" : "app"} bellPanel={bellPanel} onSignOut={signOut}>
      {page}
    </AppShell>
  );
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm font-semibold text-text">{label}</span>
      <SegmentedChoice label={label} value={value} onValueChange={onChange} options={options.map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel }))} />
    </div>
  );
}

function Region({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return <div className={tall ? "flex rounded-md md:min-h-(--size-side-panel-width) border border-dashed border-border p-3 text-caption text-info" : "rounded-md border border-dashed border-border p-3 text-caption text-info"}>{children}</div>;
}

function Toolbar({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("smart");
  const count = (value: number) => formatNumber(value, locale);
  return (
    <>
      <SegmentedChoice
        variant="chips"
        label={t("preview.filter")}
        value={filter}
        onValueChange={setFilter}
        formatCount={count}
        options={[
          { value: "all", label: t("preview.filterAll"), count: SAMPLE_COUNTS.all },
          { value: "bought", label: t("preview.filterBought"), count: SAMPLE_COUNTS.bought },
          { value: "want", label: t("preview.filterWant"), count: SAMPLE_COUNTS.want },
          { value: "deal", label: t("preview.filterDeal"), count: SAMPLE_COUNTS.deal },
          { value: "ended", label: t("preview.filterEnded"), count: SAMPLE_COUNTS.ended },
        ]}
      />
      <Select
        compact
        hideLabel
        label={t("preview.sort")}
        value={sort}
        onValueChange={setSort}
        options={[
          { value: "smart", label: t("preview.sortSmart") },
          { value: "newest", label: t("preview.sortNewest") },
          { value: "saving", label: t("preview.sortSaving") },
        ]}
      />
    </>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
      <h3 className="text-h3 text-text">{title}</h3>
      {children}
    </section>
  );
}

function States({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const label = (key: TranslationKey) => <span className="text-body-sm font-semibold text-text-muted">{t(key)}</span>;
  return (
    <Card title={t("preview.states")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3" aria-busy="true">
          {label("preview.stateLoading")}
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
        <div className="flex flex-col gap-3">
          {label("preview.stateEmpty")}
          <EmptyState icon={List} title={t("preview.emptyTitle")} description={t("preview.emptyText")} action={<Button icon={CirclePlus}>{t("preview.emptyAction")}</Button>} />
        </div>
        <div className="flex flex-col gap-3">
          {label("preview.stateError")}
          <StatusBanner tone="danger" title={t("preview.errorTitle")} action={<Button variant="secondary">{t("preview.errorAction")}</Button>}>
            {t("preview.errorText")}
          </StatusBanner>
        </div>
        <div className="flex flex-col gap-3">
          {label("preview.stateStale")}
          <StatusBanner tone="warning" action={<Button variant="ghost" icon={RefreshCw}>{t("preview.staleAction")}</Button>}>
            {t("preview.staleText")}
          </StatusBanner>
        </div>
        <div className="flex flex-col gap-3">
          {label("preview.stateSuccess")}
          <p className="text-body-sm text-text-muted">{t("preview.successText")}</p>
          <StatusBanner tone="info">{t("preview.infoText")}</StatusBanner>
        </div>
      </div>
    </Card>
  );
}

function Components({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1234567");
  const [category, setCategory] = useState("all");
  const [dealAlerts, setDealAlerts] = useState(true);
  const [consent, setConsent] = useState(false);
  const [rows, setRows] = useState<readonly boolean[]>([true, false, true]);
  const [order, setOrder] = useState("shipped");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = (value: number) => formatNumber(value, locale);
  const allRows = rows.every(Boolean);
  const someRows = rows.some(Boolean) && !allRows;
  const steps = [t("preview.stepFind"), t("preview.stepWhich"), t("preview.stepConfirm")];
  const stepIndicator = (
    <StepIndicator
      label={t("preview.steps")}
      steps={steps}
      current={1}
      completedLabel={t("common.stepCompleted")}
      progress={
        <>
          <span>{t("preview.stepProgress")}</span>
          <Button variant="ghost">{t("preview.skip")}</Button>
        </>
      }
    />
  );

  return (
    <>
      <Card title={t("preview.buttons")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("preview.confirm")}</Button>
          <Button variant="deal" icon={Zap}>
            {t("preview.deal")}
          </Button>
          <Button variant="secondary">{t("preview.mark")}</Button>
          <Button variant="ghost" icon={RefreshCw}>
            {t("preview.checkNow")}
          </Button>
          <Button variant="danger" icon={Trash2}>
            {t("preview.deleteAccount")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>{t("preview.confirm")}</Button>
          <Button loading>{t("preview.saving")}</Button>
          <Menu
            label={t("preview.more")}
            align="start"
            items={[
              { id: "check", label: t("preview.checkNow"), icon: RefreshCw },
              { id: "delete", label: t("preview.deleteAccount"), icon: Trash2, danger: true },
            ]}
            trigger={<Button variant="ghost" iconOnly icon={Ellipsis} label={t("preview.more")} />}
          />
        </div>
      </Card>

      <Card title={t("preview.fields")}>
        <div className="flex flex-col gap-4 md:flex-row">
          <TextField className="md:flex-1" label={t("preview.email")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} helper={t("preview.emailHelper")} />
          <TextField
            className="md:flex-1"
            label={t("preview.password")}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={t("preview.passwordError")}
            showPasswordLabel={t("common.showPassword")}
            hidePasswordLabel={t("common.hidePassword")}
          />
        </div>
        <Select
          label={t("preview.category")}
          value={category}
          onValueChange={setCategory}
          formatCount={count}
          options={[
            { value: "all", label: t("preview.categoryAll"), count: SAMPLE_COUNTS.all },
            { value: "electronics", label: t("preview.categoryElectronics"), count: SAMPLE_COUNTS.electronics },
            { value: "clothing", label: t("preview.categoryClothing"), count: SAMPLE_COUNTS.clothing },
          ]}
        />
      </Card>

      <Card title={t("preview.toggles")}>
        <Switch label={t("preview.dealAlerts")} description={t("preview.dealAlertsText")} checked={dealAlerts} onCheckedChange={setDealAlerts} />
        <Switch label={t("preview.securityAlerts")} checked lockedReason={t("preview.securityLocked")} onCheckedChange={() => undefined} />
        <Checkbox label={t("preview.consent")} checked={consent} onCheckedChange={setConsent} />
        <Checkbox label={t("preview.selectAll")} checked={allRows} indeterminate={someRows} onCheckedChange={(checked) => setRows(rows.map(() => checked))} />
      </Card>

      <Card title={t("preview.choices")}>
        <SegmentedChoice
          label={t("preview.orderStatus")}
          value={order}
          onValueChange={setOrder}
          options={[
            { value: "ordered", label: t("preview.ordered") },
            { value: "shipped", label: t("preview.shipped") },
            { value: "delivered", label: t("preview.delivered") },
          ]}
        />
        {stepIndicator}
      </Card>

      <Card title={t("preview.avatars")}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar initials={t("preview.initials")} size="sm" label={t("preview.initials")} />
          <Avatar initials={t("preview.initials")} size="md" label={t("preview.initials")} />
          <Avatar initials={t("preview.initials")} size="lg" label={t("preview.initials")} />
          <span className="flex items-center gap-3 text-text">
            <Icon icon={Bell} size="sm" />
            <Icon icon={Bell} size="md" />
            <Icon icon={Bell} size="lg" />
          </span>
        </div>
      </Card>

      <Card title={t("preview.overlays")}>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            {t("preview.openDialog")}
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            {t("preview.openSheet")}
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={t("preview.dialogTitle")}
          description={t("preview.dialogText")}
          icon={PackagePlus}
          closeLabel={t("common.close")}
          steps={stepIndicator}
          aside={
            <>
              <p className="text-body-sm text-text-muted">{t("preview.dialogAside")}</p>
              <Button>{t("preview.confirm")}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </Dialog>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("preview.sheetTitle")} closeLabel={t("common.closePanel")} footer={<Button>{t("preview.confirm")}</Button>}>
          <div className="flex flex-col gap-3">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </Sheet>
      </Card>
    </>
  );
}
