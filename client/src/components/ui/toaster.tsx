import { useCallback, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function SwipeableToast({ id, title, description, action, ...props }: any) {
  const { dismiss } = useToast()
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const elRef = useRef<HTMLDivElement>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - startRef.current.x
    const dy = touch.clientY - startRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const elapsed = Date.now() - startRef.current.time
    startRef.current = null

    if (dist > 40 && elapsed < 500) {
      if (elRef.current) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        let transform = ""
        if (absDx > absDy) {
          transform = `translateX(${dx > 0 ? "100%" : "-100%"})`
        } else {
          transform = `translateY(${dy > 0 ? "100%" : "-100%"})`
        }
        elRef.current.style.transition = "transform 200ms ease-out, opacity 200ms ease-out"
        elRef.current.style.transform = transform
        elRef.current.style.opacity = "0"
        setTimeout(() => dismiss(id), 200)
      } else {
        dismiss(id)
      }
    }
  }, [dismiss, id])

  return (
    <div ref={elRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Toast key={id} {...props}>
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && (
            <ToastDescription>{description}</ToastDescription>
          )}
        </div>
        {action}
        <ToastClose />
      </Toast>
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="up" swipeThreshold={40}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <SwipeableToast
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            {...props}
          />
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
