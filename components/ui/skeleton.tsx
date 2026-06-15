import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-[var(--radius-button)] animate-shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
