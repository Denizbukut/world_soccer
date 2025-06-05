"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  removeFriendRequest,
} from "@/app/actions/friends"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Check, X } from "lucide-react"
import Link from "next/link"

export default function FriendsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends")
  const [friends, setFriends] = useState<string[]>([])
  const [requests, setRequests] = useState<string[]>([])
  const [sentRequests, setSentRequests] = useState<string[]>([])
  const [searchName, setSearchName] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    const res1 = await getFriends(user.username)
    const res2 = await getPendingRequests(user.username)
    const res3 = await getSentRequests(user.username)

    if (res1.success) setFriends(res1.friends ?? [])
    if (res2.success) setRequests(res2.requests ?? [])
    if (res3.success) setSentRequests(res3.sent ?? [])
  }
const handleCancelRequest = async (receiver: string) => {
  if (!user) return
  const res = await removeFriendRequest(user.username, receiver)
  if (res.success) {
    setSentRequests((prev) => prev.filter((name) => name !== receiver))
  }
}


  const handleSend = async () => {
    if (!searchName || !user) return
    const res = await sendFriendRequest(user.username, searchName)
    if (res.success) {
      setSentRequests((prev) => [...prev, searchName])
      setFeedbackMessage("Friend request sent!")
      setFeedbackError(null)
      setSearchName("")
    } else {
      setFeedbackError(res.error || "Failed to send request")
      setFeedbackMessage(null)
    }
  }

  const handleAccept = async (sender: string) => {
    if (!user) return
    const res = await acceptFriendRequest(sender, user.username)
    if (res.success) {
      setRequests((r) => r.filter((name) => name !== sender))
      setFriends((f) => [...f, sender])
    }
  }

  const handleRemove = async (friend: string) => {
    if (!user) return
    const res = await removeFriend(user.username, friend)
    if (res.success) {
      setFriends((f) => f.filter((name) => name !== friend))
    }
  }

  const handleDecline = async (sender: string) => {
    if (!user) return
    const res = await removeFriendRequest(sender, user.username)
    if (res.success) {
      setRequests((r) => r.filter((name) => name !== sender))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <Link href="/" className="inline-flex items-center text-sm text-violet-600 hover:underline mb-2">
        ← Back to Home
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex gap-2 items-center">
          <Users className="w-5 h-5 text-violet-600" /> Friends
        </h1>
        <div className="flex gap-2">
          <Button variant={activeTab === "friends" ? "default" : "outline"} onClick={() => setActiveTab("friends")}>
            Friends
          </Button>
          <Button variant={activeTab === "requests" ? "default" : "outline"} onClick={() => setActiveTab("requests")}>
            Requests
          </Button>
        </div>
      </div>

      {activeTab === "friends" && (
        <>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value.toLowerCase())}
                placeholder="Search username"
              />
              {feedbackMessage && <p className="text-sm text-green-600 mt-1">{feedbackMessage}</p>}
              {feedbackError && <p className="text-sm text-red-600 mt-1">{feedbackError}</p>}
            </div>
            <Button onClick={handleSend} disabled={sentRequests.includes(searchName)}>
              <UserPlus className="w-4 h-4 mr-1" />
              {sentRequests.includes(searchName) ? "Pending" : "Send"}
            </Button>
          </div>

          <ul className="space-y-2 mt-4">
            {friends.map((f) => (
              <li key={f} className="flex justify-between items-center p-3 bg-white rounded shadow">
                <span className="font-medium">@{f}</span>
                <div className="flex gap-2">
                  
                  <Button size="sm" variant="destructive" onClick={() => handleRemove(f)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
            {friends.length === 0 && <p className="text-gray-500 text-sm">No friends yet.</p>}
          </ul>
        </>
      )}

      {activeTab === "requests" && (
        <>
          <h2 className="font-bold mt-6 mb-2 text-sm text-gray-700">Sent Requests</h2>
<ul className="space-y-2">
  {sentRequests.map((name) => (
    <li key={name} className="flex justify-between items-center p-3 bg-white rounded shadow text-sm text-gray-600">
      <span className="font-medium">@{name}</span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleCancelRequest(name)}
      >
        Cancel
      </Button>
    </li>
  ))}
  {sentRequests.length === 0 && (
    <p className="text-gray-400 text-sm">No sent requests.</p>
  )}
</ul>


          <h2 className="font-bold mt-6 mb-2 text-sm text-gray-700">Incoming Requests</h2>
          <ul className="space-y-2">
            {requests.map((sender) => (
              <li key={sender} className="flex justify-between items-center p-3 bg-white rounded shadow">
                <span className="font-medium">@{sender}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(sender)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDecline(sender)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
            {requests.length === 0 && <p className="text-gray-500 text-sm">No requests.</p>}
          </ul>
        </>
      )}
    </div>
  )
}
