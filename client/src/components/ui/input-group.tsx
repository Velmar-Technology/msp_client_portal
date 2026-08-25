import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputGroupVariants = cva(
  "group/input-group relative flex w-full items-center rounded-md border border-border bg-card text-foreground shadow-2xs transition-all focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring has-[[data-slot=input-group-control]:focus-visible]:border-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-ring",
  {
    variants: {
      size: {
        default: "h-8 text-xs",
        sm: "h-7 text-xs",
        lg: "h-9 text-sm",
        xs: "h-6 text-[0.6875rem]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface InputGroupProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof inputGroupVariants> {}

function InputGroup({ className, size, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      data-size={size}
      className={cn(inputGroupVariants({ size, className }))}
      {...props}
    />
  )
}

interface InputGroupAddonProps extends React.ComponentProps<"div"> {
  align?: "inline-start" | "inline-end"
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex items-center justify-center text-xs text-muted-foreground select-none shrink-0 [&_svg]:size-3.5",
        align === "inline-start" && "order-first pl-2.5 pr-1.5",
        align === "inline-end" && "order-last pr-2.5 pl-1.5 ml-auto",
        className
      )}
      {...props}
    />
  )
}

type InputGroupInputProps = React.ComponentProps<"input">

function InputGroupInput({ className, type = "text", ...props }: InputGroupInputProps) {
  return (
    <input
      type={type}
      data-slot="input-group-control"
      className={cn(
        "flex-1 min-w-0 h-full bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none border-0 shadow-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function InputGroupButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="input-group-button"
      className={cn(
        "flex items-center justify-center text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted/80 transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
  inputGroupVariants,
}
