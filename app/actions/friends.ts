"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getUserCards } from "@/app/actions"

function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: { persistSession: false },
  })
}

export async function sendFriendRequest(sender: string, receiver: string) {
  const supabase = createSupabaseServer()

  if (sender === receiver) return { success: false, error: "Cannot add yourself" }

  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("username")
    .eq("username", receiver)
    .single()

  if (targetError || !targetUser) return { success: false, error: "User not found" }

  const { data: existing } = await supabase
    .from("friend_requests")
    .select("*")
    .or(`and(sender.eq.${sender},receiver.eq.${receiver}),and(sender.eq.${receiver},receiver.eq.${sender})`)
    .maybeSingle()

  if (existing) return { success: false, error: "Friend request already exists" }

  const { error } = await supabase.from("friend_requests").insert({ sender, receiver })

  if (error) return { success: false, error: "Could not send request" }
  return { success: true }
}

export async function acceptFriendRequest(sender: string, receiver: string) {
  const supabase = createSupabaseServer()

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("sender", sender)
    .eq("receiver", receiver)

  if (updateError) return { success: false, error: "Could not accept request" }

  const { error: insertError } = await supabase.from("friends").upsert([
    { user_id: sender, friend_id: receiver },
    { user_id: receiver, friend_id: sender },
  ])

  if (insertError) return { success: false, error: "Could not create friendship" }

  return { success: true }
}

export async function removeFriend(user1: string, user2: string) {
  const supabase = createSupabaseServer()

  const { error: deleteFriendsError } = await supabase
    .from("friends")
    .delete()
    .or(`and(user_id.eq.${user1},friend_id.eq.${user2}),and(user_id.eq.${user2},friend_id.eq.${user1})`)

  if (deleteFriendsError) return { success: false, error: "Failed to remove friend" }

  const { error: deleteRequestError } = await supabase
    .from("friend_requests")
    .delete()
    .or(`and(sender.eq.${user1},receiver.eq.${user2}),and(sender.eq.${user2},receiver.eq.${user1})`)

  if (deleteRequestError) {
    console.error("Failed to remove friend_requests entry:", deleteRequestError)
  }

  return { success: true }
}

export async function removeFriendRequest(sender: string, receiver: string) {
  const supabase = createSupabaseServer()

  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("sender", sender)
    .eq("receiver", receiver)

  if (error) {
    console.error("Failed to remove friend request:", error)
    return { success: false, error: "Could not remove request" }
  }

  return { success: true }
}

export async function getPendingRequests(username: string) {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from("friend_requests")
    .select("sender")
    .eq("receiver", username)
    .eq("status", "pending")

  if (error) {
    console.error("Error fetching friend requests:", error)
    return { success: false, error: "Failed to fetch friend requests" }
  }

  const requests = data?.map((row) => row.sender) ?? []
  return { success: true, requests }
}

export async function getSentRequests(username: string) {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from("friend_requests")
    .select("receiver")
    .eq("sender", username)
    .eq("status", "pending")

  if (error) {
    console.error("Error fetching sent requests:", error)
    return { success: false, error: "Failed to fetch sent requests" }
  }

  const sent = data?.map((row) => row.receiver) ?? []
  return { success: true, sent }
}

export async function getFriends(username: string) {
  const supabase = createSupabaseServer()

  const { data, error } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", username)

  if (error) {
    console.error("Error fetching friends:", error)
    return { success: false, error: "Failed to fetch friends" }
  }

  const friends = data?.map((row) => row.friend_id) || []
  return { success: true, friends }
}

export async function getFriendCollection(friendUsername: string) {
  return getUserCards(friendUsername)
}
