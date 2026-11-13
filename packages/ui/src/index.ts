// Canonical components (pagedesign.md §5). Names are exactly those of the list.
// Shells (AppShell, AuthShell, AdminShell) live in the web app: they own routing.
export { Avatar, type AvatarProps, type AvatarSize } from "./avatar";
export { Button, buttonClasses, type ButtonProps, type ButtonVariant } from "./button";
export { Checkbox, type CheckboxProps } from "./checkbox";
export { cn, focusRing } from "./cn";
export { Dialog, type DialogProps } from "./dialog";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { Icon, type IconProps, type IconSize } from "./icon";
export { LinkProvider, useLinkComponent, type LinkProps } from "./link";
export { Menu, type MenuItem, type MenuProps } from "./menu";
export { PageTemplate, type PageTemplateKind, type PageTemplateProps } from "./page-template";
export { SegmentedChoice, type SegmentedChoiceProps, type SegmentedOption } from "./segmented-choice";
export { Select, type SelectOption, type SelectProps } from "./select";
export { Sheet, type SheetProps } from "./sheet";
export { SkeletonBlock, SkeletonRow, type SkeletonBlockProps, type SkeletonShape, type SkeletonWidth } from "./skeleton-block";
export { StatusBanner, type StatusBannerProps, type StatusTone } from "./status-banner";
export { StepIndicator, type StepIndicatorProps } from "./step-indicator";
export { Switch, type SwitchProps } from "./switch";
export { TextField, type TextFieldProps } from "./text-field";
export { Tooltip, type TooltipProps } from "./tooltip";
