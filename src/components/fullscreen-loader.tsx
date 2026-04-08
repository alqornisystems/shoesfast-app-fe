import { Shirt } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  message?: string
  className?: string
}

export function FullscreenLoader({ message = "Memuat...", className }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-6",
        className
      )}
    >
      {/* Animated logo */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <span className="absolute h-16 w-16 rounded-2xl border-2 border-primary/20 animate-ping" />
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Shirt className="h-7 w-7 text-primary-foreground" />
        </div>
      </div>

      {/* Dots loader */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground tracking-wide">{message}</p>
    </div>
  )
}
