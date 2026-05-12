"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-blue-600 data-unchecked:bg-gray-200 dark:data-unchecked:bg-gray-800",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-checked:translate-x-4 data-unchecked:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
