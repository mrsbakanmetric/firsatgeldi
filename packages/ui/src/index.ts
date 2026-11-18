// Canonical components (pagedesign.md §5). Names are exactly those of the list.
// Shells (AppShell, AuthShell, AdminShell) live in the web app: they own routing.
export { AttributeChip, chipClasses, type AttributeChipProps, type AttributeChipTexts } from "./attribute-chip";
export { CategoryFilter, SortSelect, type CategoryFilterProps, type ChipSelectOption, type SortSelectProps } from "./chip-select";
export { Avatar, type AvatarProps, type AvatarSize } from "./avatar";
export { AvatarCrop, AvatarUpload, type AvatarCropProps, type AvatarUploadProps } from "./avatar-upload";
export { ConfirmPanel, ConfirmSection, type ConfirmPanelProps } from "./confirm-panel";
export { FactTile, FactTiles, type FactTileProps, type FactVerdict } from "./fact-tile";
export { FilterChips, type FilterChipOption, type FilterChipsProps } from "./filter-chips";
export { EmailSentBlock, type EmailSentBlockProps } from "./email-sent-block";
export { Flag, type FlagProps, type FlagTone } from "./flag";
export { FreshnessLine, type FreshnessLineProps } from "./freshness-line";
export { GuestProductCard, type GuestProductCardProps } from "./guest-product-card";
export { HeroBlock, type HeroBlockProps } from "./hero-block";
export { HiddenOfferCard, type HiddenOfferCardProps, type RevealedSeller } from "./hidden-offer-card";
export { MoneyDisplay, type MoneyDisplayProps, type MoneySize, type MoneyTone } from "./money-display";
export { ImagePrivacyNote, MultiImageUpload, type MultiImageUploadProps, type UploadFileState, type UploadFileView } from "./multi-image-upload";
export { PasswordRules, type PasswordRule, type PasswordRulesProps } from "./password-rules";
export { PriceHistory, type PriceHistoryEnd, type PriceHistoryProps, type PriceHistoryTile } from "./price-history";
export { PriceSparkline, type PriceSparklineProps } from "./price-sparkline";
export { ProductImage, type ProductImageProps, type ProductImageSize } from "./product-image";
export { ProviderButton, type ProviderButtonProps } from "./provider-button";
export { ProductRow, type ProductRowColumn, type ProductRowProps } from "./product-row";
export { SearchBox, type SearchBoxProps } from "./search-box";
export { SearchField, type SearchFieldProps } from "./search-field";
export { Button, buttonClasses, type ButtonProps, type ButtonSize, type ButtonVariant } from "./button";
export { Checkbox, type CheckboxProps } from "./checkbox";
export { cn, focusRing } from "./cn";
export { useEscape, useOutsidePress } from "./overlay";
export { Dialog, type DialogProps } from "./dialog";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { Icon, type IconProps, type IconSize } from "./icon";
export { LinkProvider, useLinkComponent, type LinkProps } from "./link";
export { Menu, type MenuItem, type MenuProps } from "./menu";
export { PageTemplate, type PageTemplateKind, type PageTemplateProps } from "./page-template";
export { SegmentedChoice, type SegmentedChoiceProps, type SegmentedOption } from "./segmented-choice";
export { Select, type SelectOption, type SelectProps } from "./select";
export { Sheet, type SheetProps } from "./sheet";
export {
  ActionCard,
  ChannelMatrix,
  ChoiceCards,
  MaskedValue,
  PermissionGroup,
  RoleCard,
  SavedIndicator,
  SessionRow,
  SettingRow,
  SettingsNav,
  ToggleChips,
  type ActionCardProps,
  type ChannelMatrixChannel,
  type ChannelMatrixProps,
  type ChannelMatrixRow,
  type ChoiceCardOption,
  type ChoiceCardsProps,
  type MaskedValueProps,
  type PermissionGroupProps,
  type RoleCardProps,
  type SessionRowProps,
  type SettingRowProps,
  type SettingsNavItem,
  type SettingsNavProps,
  type ToggleChipOption,
  type ToggleChipsProps,
} from "./settings-parts";
export {
  PersonRow,
  ProfileHeader,
  SharedDealRow,
  Tabs,
  tabId,
  tabPanelId,
  ViewAsPreview,
  VisibilityCard,
  type PersonRowProps,
  type ProfileHeaderProps,
  type SharedDealRowProps,
  type SharedDealTone,
  type TabsProps,
  type ViewAsPreviewProps,
  type VisibilityCardProps,
} from "./profile-parts";
export { SkeletonBlock, SkeletonRow, type SkeletonBlockProps, type SkeletonShape, type SkeletonWidth } from "./skeleton-block";
export { StatTile, StatTiles, type StatTileProps } from "./stat-tile";
export { StatusBanner, type StatusBannerProps, type StatusTone } from "./status-banner";
export { StockKey, StockStrip, type StockDay, type StockStripProps } from "./stock-strip";
export { StockHistory, type StockHistoryBlock, type StockHistoryProps } from "./stock-history";
export { StepTick, type StepTickProps } from "./step-tick";
export { StepIndicator, type StepIndicatorProps } from "./step-indicator";
export { Switch, type SwitchProps } from "./switch";
export { TextField, type TextFieldProps } from "./text-field";
export { Tooltip, type TooltipProps } from "./tooltip";
