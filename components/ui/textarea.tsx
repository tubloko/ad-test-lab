import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-sm border border-border bg-surface px-3 py-2 text-body text-text transition-colors outline-none placeholder:text-text-subtle focus:border-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger-border",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
