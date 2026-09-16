import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Typography components adhering to Shadcn / Tailwind v4 standards.
 * Provides accessible, semantic, and balanced typographic elements.
 */

/**
 * Level 1 Heading with text-balance and font-heading.
 */
export function TypographyH1({
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="typography-h1"
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl font-heading text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Level 2 Heading with bottom border and text-balance.
 */
export function TypographyH2({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="typography-h2"
      className={cn(
        "scroll-m-20 border-b border-border pb-2 text-3xl font-semibold tracking-tight text-balance first:mt-0 font-heading text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Level 3 Heading with text-balance.
 */
export function TypographyH3({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="typography-h3"
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight text-balance font-heading text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Level 4 Heading with text-balance.
 */
export function TypographyH4({
  className,
  ...props
}: React.ComponentProps<"h4">) {
  return (
    <h4
      data-slot="typography-h4"
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight text-balance font-heading text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Standard body paragraph with text-pretty, text-sm, and text-muted-foreground.
 */
export function TypographyP({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-p"
      className={cn(
        "text-sm text-muted-foreground leading-7 text-pretty [&:not(:first-child)]:mt-6",
        className
      )}
      {...props}
    />
  )
}

/**
 * Blockquote styling with left border and italic muted text.
 */
export function TypographyBlockquote({
  className,
  ...props
}: React.ComponentProps<"blockquote">) {
  return (
    <blockquote
      data-slot="typography-blockquote"
      className={cn(
        "mt-6 border-l-2 border-border pl-6 italic text-muted-foreground text-pretty",
        className
      )}
      {...props}
    />
  )
}

/**
 * Lead paragraph for emphasis at top of sections.
 */
export function TypographyLead({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-lead"
      className={cn("text-xl text-muted-foreground text-pretty leading-relaxed", className)}
      {...props}
    />
  )
}

/**
 * Large text element for section callouts or strong highlights.
 */
export function TypographyLarge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="typography-large"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

/**
 * Small text element for auxiliary notes and labels.
 */
export function TypographySmall({
  className,
  ...props
}: React.ComponentProps<"small">) {
  return (
    <small
      data-slot="typography-small"
      className={cn("text-sm font-medium leading-none text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * Muted paragraph for descriptions and secondary text.
 */
export function TypographyMuted({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="typography-muted"
      className={cn("text-sm text-muted-foreground text-pretty", className)}
      {...props}
    />
  )
}

/**
 * Inline code snippet wrapper.
 */
export function TypographyInlineCode({
  className,
  ...props
}: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="typography-code"
      className={cn(
        "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Unordered list with consistent vertical spacing and text-pretty styling.
 */
export function TypographyList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="typography-list"
      className={cn(
        "my-6 ml-6 list-disc [&>li]:mt-2 text-pretty text-muted-foreground text-sm",
        className
      )}
      {...props}
    />
  )
}
