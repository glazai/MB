"use client"

// Renders a native <select> instead of Radix's Select primitive.
// Radix's DismissableLayer swallows taps on touch devices (any finger
// movement between touchdown/touchup cancels the click) — a native
// select uses the OS's own picker and is immune to that class of bug.
// The component API below matches the old Radix-backed version exactly
// so every call site is unaffected.

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SelectItemData = { value: string; label: string; disabled?: boolean }

function collectItems(node: React.ReactNode): SelectItemData[] {
  const items: SelectItemData[] = []
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean }
    if (child.type === SelectItem && typeof props.value === "string") {
      items.push({
        value: props.value,
        label: typeof props.children === "string" ? props.children : String(props.children ?? ""),
        disabled: props.disabled,
      })
      return
    }
    if (props.children) {
      items.push(...collectItems(props.children))
    }
  })
  return items
}

function findPlaceholder(node: React.ReactNode): string | undefined {
  let placeholder: string | undefined
  React.Children.forEach(node, (child) => {
    if (placeholder || !React.isValidElement(child)) return
    const props = child.props as { placeholder?: string; children?: React.ReactNode }
    if (child.type === SelectValue) {
      placeholder = props.placeholder
      return
    }
    if (props.children) {
      placeholder = findPlaceholder(props.children)
    }
  })
  return placeholder
}

function Select({
  value,
  onValueChange,
  defaultValue,
  disabled,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  let triggerId: string | undefined
  let triggerClassName: string | undefined
  let triggerSize: "sm" | "default" = "default"
  let items: SelectItemData[] = []
  let placeholder: string | undefined

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectTrigger) {
      const props = child.props as { id?: string; className?: string; size?: "sm" | "default"; children?: React.ReactNode }
      triggerId = props.id
      triggerClassName = props.className
      triggerSize = props.size ?? "default"
      placeholder = findPlaceholder(props.children)
    } else if (child.type === SelectContent) {
      const props = child.props as { children?: React.ReactNode }
      items = collectItems(props.children)
    }
  })

  const hasMatch = items.some((item) => item.value === value)

  return (
    <div className="relative w-fit">
      <select
        id={triggerId}
        disabled={disabled}
        value={hasMatch ? value : ""}
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(e.target.value)}
        data-slot="select-trigger"
        data-size={triggerSize}
        className={cn(
          "flex w-fit items-center rounded-lg border border-input bg-transparent py-2 pr-8 pl-2.5 text-sm outline-none transition-colors appearance-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)]",
          "dark:bg-input/30 dark:hover:bg-input/50",
          !hasMatch && "text-muted-foreground",
          triggerClassName,
        )}
      >
        {!hasMatch && (
          <option value="" disabled hidden>
            {placeholder ?? ""}
          </option>
        )}
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function SelectTrigger(_props: {
  id?: string
  className?: string
  size?: "sm" | "default"
  children?: React.ReactNode
}) {
  return null
}

function SelectContent(_props: { children?: React.ReactNode }) {
  return null
}

function SelectValue(_props: { placeholder?: string }) {
  return null
}

function SelectItem(_props: { value: string; children?: React.ReactNode; disabled?: boolean }) {
  return null
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
