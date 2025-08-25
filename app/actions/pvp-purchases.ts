"use server"

import { createSupabaseServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function getUserPvpPurchaseHistory(username: string, limit: number = 10) {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data, error } = await supabase
      .from("pvp_purchases")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching PvP purchase history:", error)
      return { success: false, error: "Failed to fetch PvP purchase history" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getUserPvpPurchaseHistory:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getPvpPurchaseStats(username: string) {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    // Get total purchases and amount
    const { data: totalData, error: totalError } = await supabase
      .from("pvp_purchases")
      .select("amount, price_usd, discounted")
      .eq("username", username)

    if (totalError) {
      console.error("Error fetching PvP purchase stats:", totalError)
      return { success: false, error: "Failed to fetch PvP purchase stats" }
    }

    const totalBattles = totalData?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0
    const totalSpent = totalData?.reduce((sum, purchase) => sum + Number(purchase.price_usd), 0) || 0
    const totalPurchases = totalData?.length || 0
    const discountedPurchases = totalData?.filter(p => p.discounted).length || 0

    // Get recent purchases (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentData, error: recentError } = await supabase
      .from("pvp_purchases")
      .select("amount, price_usd")
      .eq("username", username)
      .gte("created_at", sevenDaysAgo.toISOString())

    if (recentError) {
      console.error("Error fetching recent PvP purchases:", recentError)
    }

    const recentBattles = recentData?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0
    const recentSpent = recentData?.reduce((sum, purchase) => sum + Number(purchase.price_usd), 0) || 0

    return {
      success: true,
      data: {
        totalBattles,
        totalSpent: Number(totalSpent.toFixed(2)),
        totalPurchases,
        discountedPurchases,
        recentBattles,
        recentSpent: Number(recentSpent.toFixed(2)),
        averagePrice: totalPurchases > 0 ? Number((totalSpent / totalPurchases).toFixed(2)) : 0
      }
    }
  } catch (error) {
    console.error("Error in getPvpPurchaseStats:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getGlobalPvpPurchaseStats() {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    // Get total global stats
    const { data: totalData, error: totalError } = await supabase
      .from("pvp_purchases")
      .select("amount, price_usd, discounted")

    if (totalError) {
      console.error("Error fetching global PvP purchase stats:", totalError)
      return { success: false, error: "Failed to fetch global PvP purchase stats" }
    }

    const totalBattles = totalData?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0
    const totalRevenue = totalData?.reduce((sum, purchase) => sum + Number(purchase.price_usd), 0) || 0
    const totalPurchases = totalData?.length || 0
    const discountedPurchases = totalData?.filter(p => p.discounted).length || 0

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayData, error: todayError } = await supabase
      .from("pvp_purchases")
      .select("amount, price_usd")
      .gte("created_at", today.toISOString())

    if (todayError) {
      console.error("Error fetching today's PvP purchases:", todayError)
    }

    const todayBattles = todayData?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0
    const todayRevenue = todayData?.reduce((sum, purchase) => sum + Number(purchase.price_usd), 0) || 0

    return {
      success: true,
      data: {
        totalBattles,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalPurchases,
        discountedPurchases,
        todayBattles,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        averagePrice: totalPurchases > 0 ? Number((totalRevenue / totalPurchases).toFixed(2)) : 0
      }
    }
  } catch (error) {
    console.error("Error in getGlobalPvpPurchaseStats:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
