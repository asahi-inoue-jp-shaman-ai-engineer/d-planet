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

const ERROR_MSG_MAP: Record<string, string> = {
  "Failed to fetch": "サーバーに接続できません。ネットワーク接続を確認してください。",
  "NetworkError": "ネットワークエラーが発生しました。接続を確認してください。",
  "Load failed": "データの読み込みに失敗しました。もう一度お試しください。",
}

function humanizeError(msg: string | undefined): string | undefined {
  if (!msg) return msg;
  for (const [key, val] of Object.entries(ERROR_MSG_MAP)) {
    if (msg.includes(key)) return val;
  }
  const statusMatch = msg.match(/^(\d{3}): (.+)$/);
  if (statusMatch) {
    const [, code, body] = statusMatch;
    try {
      const parsed = JSON.parse(body);
      if (parsed.message) return parsed.message;
    } catch {}
    const statusMessages: Record<string, string> = {
      "400": "リクエストに問題があります。",
      "401": "ログインが必要です。",
      "403": "この操作を行う権限がありません。",
      "404": "お探しのものが見つかりません。",
      "429": "リクエストが多すぎます。しばらく待ってから再度お試しください。",
      "500": "サーバーで予期しないエラーが発生しました。",
      "502": "サーバーが一時的に利用できません。",
      "503": "サービスが一時的に利用できません。",
    };
    return statusMessages[code] || `エラーが発生しました（コード: ${code}）`;
  }
  return msg;
}

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

  const isDestructive = props.variant === "destructive";
  const friendlyDesc = isDestructive && typeof description === "string"
    ? humanizeError(description)
    : description;

  return (
    <div ref={elRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Toast key={id} {...props}>
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {friendlyDesc && (
            <ToastDescription>{friendlyDesc}</ToastDescription>
          )}
          {isDestructive && (
            <a
              href="/create-feedback"
              className="text-[10px] text-red-200/70 hover:text-red-100 underline mt-1 inline-block"
              data-testid="link-error-feedback"
            >
              繰り返す場合はスクショを撮ってフィードバックにお知らせください
            </a>
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
