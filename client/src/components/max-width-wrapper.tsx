import { cn } from "@/lib/utils";

export interface MaxWidthWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function MaxWidthWrapper({
  children,
  className,
  ...props
}: MaxWidthWrapperProps) {
  return (
    <div
      className={cn("w-full h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default MaxWidthWrapper;