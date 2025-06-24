import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Smile } from "lucide-react"
import dynamic from "next/dynamic"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

const supabase = getSupabaseBrowserClient()

interface ClanChatMessage {
  user_id: string
  message: string
  created_at: string
}

export default function ClanChat({ clanId }: { clanId: number }) {
  const [messages, setMessages] = useState<ClanChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const { user } = useAuth()
  const username = user?.username
  const bottomRef = useRef<HTMLDivElement>(null)
  const [lastSentAt, setLastSentAt] = useState<number>(0)
const [cooldown, setCooldown] = useState<number>(0)

useEffect(() => {
  if (cooldown > 0) {
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(interval)
  }
}, [cooldown])


  useEffect(() => {
    loadMessages()
  }, [clanId])

  async function loadMessages() {
    if (!supabase) return

    const { data, error } = await supabase
      .from("clan_chat_messages")
      .select("user_id, message, created_at")
      .eq("clan_id", clanId)
      .order("created_at", { ascending: true })
      .limit(100)

    if (!error && data) {
      const typedData = data.map((msg) => ({
        user_id: String(msg.user_id),
        message: String(msg.message),
        created_at: String(msg.created_at),
      }))
      setMessages(typedData)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
  }

  async function sendMessage() {
  if (!newMessage.trim() || !username || !supabase || loading || cooldown > 0) return

  const now = Date.now()
  if (now - lastSentAt < 15000) {
    const remaining = 15 - Math.floor((now - lastSentAt) / 1000)
    setCooldown(remaining)
    return
  }

  setLoading(true)

  await supabase.from("clan_chat_messages").insert({
    clan_id: clanId,
    user_id: username,
    message: newMessage.trim(),
  })

  // Optional: Cleanup alter Nachrichten
  const { data } = await supabase
    .from("clan_chat_messages")
    .select("id")
    .eq("clan_id", clanId)
    .order("created_at", { ascending: true })

  if (data && data.length > 100) {
    const idsToDelete = data.slice(0, data.length - 100).map((msg) => msg.id)
    if (idsToDelete.length > 0) {
      await supabase.from("clan_chat_messages").delete().in("id", idsToDelete)
    }
  }

  setNewMessage("")
  setLastSentAt(now)
  setCooldown(15)
  setLoading(false)
  loadMessages()
}


  function truncateUsername(name: string): string {
    return name.length > 14 ? name.slice(0, 14) + "…" : name
  }

  function handleEmojiClick(emojiData: any) {
    setNewMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="flex flex-col h-[500px] max-h-[80vh] w-full rounded-xl border p-2 bg-white shadow">
      <div className="flex-1 overflow-y-auto space-y-2 px-1">
        {messages.map((msg, idx) => {
          const isOwn = msg.user_id === username
          return (
            <div
              key={idx}
              className={`text-sm p-3 rounded-xl max-w-[80%] whitespace-pre-wrap break-words ${
                isOwn ? "bg-blue-100 self-end ml-auto text-right" : "bg-gray-100"
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {truncateUsername(msg.user_id)} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </div>
              <div className="text-sm leading-relaxed">{msg.message}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 relative">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded hover:bg-muted/30"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !newMessage.trim() || cooldown > 0}>
  {cooldown > 0 ? `${cooldown}s` : "Send"}
</Button>

        </div>
        {showEmojiPicker && (
          <div className="absolute bottom-12 z-10">
            <EmojiPicker onEmojiClick={handleEmojiClick} height={350} width={280} />
          </div>
        )}
      </div>
    </div>
  )
}