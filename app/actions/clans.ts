"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Create a server-side Supabase client
function createSupabaseServer() {
  return createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
    auth: {
      persistSession: false,
    },
  })
}

// Typen für Clans
export type Clan = {
  id: number
  name: string
  description: string | null
  level: number
  xp: number
  xp_needed: number
  created_at: string
  founder_id: string
  logo_url: string | null
  member_count: number
}

// Clan erstellen
export async function createClan(username: string, name: string, description: string) {
  try {
    const supabase = createSupabaseServer()

    // Überprüfen, ob der Benutzer bereits in einem Clan ist
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error checking user clan:", userError)
      return { success: false, error: "Benutzer nicht gefunden" }
    }

    if (userData.clan_id) {
      return { success: false, error: "Du bist bereits in einem Clan" }
    }

    // Überprüfen, ob der Clan-Name bereits existiert
    const { data: existingClan, error: existingClanError } = await supabase
      .from("clans")
      .select("id")
      .eq("name", name)
      .single()

    if (existingClan) {
      return { success: false, error: "Ein Clan mit diesem Namen existiert bereits" }
    }

    // Clan erstellen
    const { data: clan, error: clanError } = await supabase
      .from("clans")
      .insert({
        name,
        description,
        founder_id: username,
      })
      .select()
      .single()

    if (clanError) {
      console.error("Error creating clan:", clanError)
      return { success: false, error: "Fehler beim Erstellen des Clans" }
    }

    // Benutzer dem Clan zuweisen
    const { error: updateError } = await supabase.from("users").update({ clan_id: clan.id }).eq("username", username)

    if (updateError) {
      console.error("Error updating user clan:", updateError)
      return { success: false, error: "Fehler beim Zuweisen des Clans" }
    }

    // Clan-Aktivität erstellen
    await supabase.from("clan_activities").insert({
      clan_id: clan.id,
      user_id: username,
      activity_type: "create",
      description: `${username} hat den Clan "${name}" gegründet`,
      xp_earned: 10,
    })

    revalidatePath("/")
    revalidatePath("/clan")

    return { success: true, clan }
  } catch (error) {
    console.error("Error in createClan:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Clan beitreten (Anfrage senden)
export async function requestJoinClan(username: string, clanId: number) {
  try {
    const supabase = createSupabaseServer()

    // Überprüfen, ob der Benutzer bereits in einem Clan ist
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error checking user clan:", userError)
      return { success: false, error: "Benutzer nicht gefunden" }
    }

    if (userData.clan_id) {
      return { success: false, error: "Du bist bereits in einem Clan" }
    }

    // Überprüfen, ob bereits eine Anfrage existiert
    const { data: existingRequest, error: requestError } = await supabase
      .from("clan_requests")
      .select("id, status")
      .eq("clan_id", clanId)
      .eq("user_id", username)
      .single()

    if (existingRequest && existingRequest.status === "pending") {
      return { success: false, error: "Du hast bereits eine Anfrage an diesen Clan gesendet" }
    }

    // Anfrage erstellen oder aktualisieren
    if (existingRequest) {
      const { error: updateError } = await supabase
        .from("clan_requests")
        .update({ status: "pending" })
        .eq("id", existingRequest.id)

      if (updateError) {
        console.error("Error updating clan request:", updateError)
        return { success: false, error: "Fehler beim Aktualisieren der Anfrage" }
      }
    } else {
      const { error: insertError } = await supabase.from("clan_requests").insert({
        clan_id: clanId,
        user_id: username,
      })

      if (insertError) {
        console.error("Error creating clan request:", insertError)
        return { success: false, error: "Fehler beim Erstellen der Anfrage" }
      }
    }

    revalidatePath("/clan")

    return { success: true }
  } catch (error) {
    console.error("Error in requestJoinClan:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Clan-Anfrage akzeptieren (nur für Clan-Gründer)
export async function acceptClanRequest(username: string, requestId: number) {
  try {
    const supabase = createSupabaseServer()

    // Anfrage abrufen
    const { data: request, error: requestError } = await supabase
      .from("clan_requests")
      .select("*, clans(founder_id, id, name)")
      .eq("id", requestId)
      .single()

    if (requestError) {
      console.error("Error fetching clan request:", requestError)
      return { success: false, error: "Anfrage nicht gefunden" }
    }

    // Überprüfen, ob der Benutzer der Gründer des Clans ist
    if (request.clans.founder_id !== username) {
      return { success: false, error: "Du hast keine Berechtigung, diese Anfrage zu akzeptieren" }
    }

    // Anfrage akzeptieren
    const { error: updateRequestError } = await supabase
      .from("clan_requests")
      .update({ status: "accepted" })
      .eq("id", requestId)

    if (updateRequestError) {
      console.error("Error updating clan request:", updateRequestError)
      return { success: false, error: "Fehler beim Akzeptieren der Anfrage" }
    }

    // Benutzer dem Clan zuweisen
    const { error: updateUserError } = await supabase
      .from("users")
      .update({ clan_id: request.clan_id })
      .eq("username", request.user_id)

    if (updateUserError) {
      console.error("Error updating user clan:", updateUserError)
      return { success: false, error: "Fehler beim Zuweisen des Clans" }
    }

    // Mitgliederzahl erhöhen
    const { error: updateClanError } = await supabase
      .from("clans")
      .update({ member_count: request.clans.member_count + 1 })
      .eq("id", request.clan_id)

    if (updateClanError) {
      console.error("Error updating clan member count:", updateClanError)
    }

    // Clan-Aktivität erstellen
    await supabase.from("clan_activities").insert({
      clan_id: request.clan_id,
      user_id: request.user_id,
      activity_type: "join",
      description: `${request.user_id} ist dem Clan "${request.clans.name}" beigetreten`,
      xp_earned: 5,
    })

    revalidatePath("/clan")

    return { success: true }
  } catch (error) {
    console.error("Error in acceptClanRequest:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Clan verlassen
export async function leaveClan(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Benutzer und Clan-Informationen abrufen
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user:", userError)
      return { success: false, error: "Benutzer nicht gefunden" }
    }

    if (!userData.clan_id) {
      return { success: false, error: "Du bist in keinem Clan" }
    }

    // Clan-Informationen abrufen
    const { data: clanData, error: clanError } = await supabase
      .from("clans")
      .select("founder_id, name, member_count")
      .eq("id", userData.clan_id)
      .single()

    if (clanError) {
      console.error("Error fetching clan:", clanError)
      return { success: false, error: "Clan nicht gefunden" }
    }

    // Überprüfen, ob der Benutzer der Gründer ist
    if (clanData.founder_id === username) {
      return { success: false, error: "Als Gründer kannst du den Clan nicht verlassen. Du musst ihn auflösen." }
    }

    // Benutzer aus dem Clan entfernen
    const { error: updateError } = await supabase.from("users").update({ clan_id: null }).eq("username", username)

    if (updateError) {
      console.error("Error removing user from clan:", updateError)
      return { success: false, error: "Fehler beim Verlassen des Clans" }
    }

    // Mitgliederzahl verringern
    const { error: updateClanError } = await supabase
      .from("clans")
      .update({ member_count: clanData.member_count - 1 })
      .eq("id", userData.clan_id)

    if (updateClanError) {
      console.error("Error updating clan member count:", updateClanError)
    }

    // Clan-Aktivität erstellen
    await supabase.from("clan_activities").insert({
      clan_id: userData.clan_id,
      user_id: username,
      activity_type: "leave",
      description: `${username} hat den Clan "${clanData.name}" verlassen`,
      xp_earned: 0,
    })

    revalidatePath("/")
    revalidatePath("/clan")

    return { success: true }
  } catch (error) {
    console.error("Error in leaveClan:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Clan auflösen (nur für Gründer)
export async function dissolveClan(username: string, clanId: number) {
  try {
    const supabase = createSupabaseServer()

    // Clan-Informationen abrufen
    const { data: clanData, error: clanError } = await supabase
      .from("clans")
      .select("founder_id")
      .eq("id", clanId)
      .single()

    if (clanError) {
      console.error("Error fetching clan:", clanError)
      return { success: false, error: "Clan nicht gefunden" }
    }

    // Überprüfen, ob der Benutzer der Gründer ist
    if (clanData.founder_id !== username) {
      return { success: false, error: "Nur der Gründer kann den Clan auflösen" }
    }

    // Alle Benutzer aus dem Clan entfernen
    const { error: updateUsersError } = await supabase.from("users").update({ clan_id: null }).eq("clan_id", clanId)

    if (updateUsersError) {
      console.error("Error removing users from clan:", updateUsersError)
      return { success: false, error: "Fehler beim Entfernen der Mitglieder" }
    }

    // Clan löschen
    const { error: deleteClanError } = await supabase.from("clans").delete().eq("id", clanId)

    if (deleteClanError) {
      console.error("Error deleting clan:", deleteClanError)
      return { success: false, error: "Fehler beim Löschen des Clans" }
    }

    revalidatePath("/")
    revalidatePath("/clan")

    return { success: true }
  } catch (error) {
    console.error("Error in dissolveClan:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Alle Clans abrufen
export async function getAllClans(page = 1, pageSize = 10) {
  try {
    const supabase = createSupabaseServer()
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // Clans abrufen
    const {
      data: clans,
      error,
      count,
    } = await supabase
      .from("clans")
      .select("*", { count: "exact" })
      .order("level", { ascending: false })
      .order("xp", { ascending: false })
      .range(start, end)

    if (error) {
      console.error("Error fetching clans:", error)
      return { success: false, error: "Fehler beim Abrufen der Clans" }
    }

    return {
      success: true,
      clans,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    }
  } catch (error) {
    console.error("Error in getAllClans:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Clan-Details abrufen
export async function getClanDetails(clanId: number) {
  try {
    const supabase = createSupabaseServer()

    // Clan-Informationen abrufen
    const { data: clan, error: clanError } = await supabase.from("clans").select("*").eq("id", clanId).single()

    if (clanError) {
      console.error("Error fetching clan:", clanError)
      return { success: false, error: "Clan nicht gefunden" }
    }

    // Clan-Mitglieder abrufen
    const { data: members, error: membersError } = await supabase
      .from("users")
      .select("username, level, avatar_url")
      .eq("clan_id", clanId)
      .order("level", { ascending: false })

    if (membersError) {
      console.error("Error fetching clan members:", membersError)
      return { success: false, error: "Fehler beim Abrufen der Clan-Mitglieder" }
    }

    // Clan-Aktivitäten abrufen
    const { data: activities, error: activitiesError } = await supabase
      .from("clan_activities")
      .select("*")
      .eq("clan_id", clanId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (activitiesError) {
      console.error("Error fetching clan activities:", activitiesError)
      return { success: false, error: "Fehler beim Abrufen der Clan-Aktivitäten" }
    }

    return {
      success: true,
      clan,
      members,
      activities,
    }
  } catch (error) {
    console.error("Error in getClanDetails:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}

// Benutzer-Clan abrufen
export async function getUserClan(username: string) {
  try {
    const supabase = createSupabaseServer()

    // Benutzer-Informationen abrufen
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("clan_id")
      .eq("username", username)
      .single()

    if (userError) {
      console.error("Error fetching user:", userError)
      return { success: false, error: "Benutzer nicht gefunden" }
    }

    if (!userData.clan_id) {
      return { success: true, clan: null }
    }

    // Clan-Informationen abrufen
    const { data: clan, error: clanError } = await supabase
      .from("clans")
      .select("*")
      .eq("id", userData.clan_id)
      .single()

    if (clanError) {
      console.error("Error fetching clan:", clanError)
      return { success: false, error: "Clan nicht gefunden" }
    }

    return { success: true, clan }
  } catch (error) {
    console.error("Error in getUserClan:", error)
    return { success: false, error: "Ein unerwarteter Fehler ist aufgetreten" }
  }
}
