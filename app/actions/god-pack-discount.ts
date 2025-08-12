"use server"

function createSupabaseServer() {
  const { createClient } = require("@supabase/supabase-js")
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getActiveGodPackDiscount() {
  try {
    const supabase = createSupabaseServer()
    
    // Verwende die neue god_pack_discounts Tabelle
    const { data, error } = await supabase
      .rpc('get_active_god_pack_discount')

    if (error) {
      console.log("Database error:", error)
      return { success: false, data: null }
    }

    if (!data || data.length === 0) {
      console.log("No active god pack discount found")
      return { success: false, data: null }
    }

    const discountData = data[0] // Nimm den ersten (aktuellsten) Rabatt
    console.log("Found active god pack discount:", discountData)

    // Prüfe ob der Rabatt noch gültig ist
    if (discountData.end_time) {
      const now = new Date()
      const endTime = new Date(discountData.end_time)
      
      console.log("Current time:", now.toISOString())
      console.log("End time:", endTime.toISOString())
      console.log("Is expired:", now > endTime)
      
      if (now > endTime) {
        console.log("God pack discount expired, deactivating...")
        // Rabatt ist abgelaufen, deaktiviere ihn
        await supabase.rpc('deactivate_god_pack_discount')
        
        return { success: false, data: null }
      }
    }

    console.log("God pack discount is valid and active")
    return { 
      success: true, 
      data: {
        id: discountData.id,
        value: discountData.discount_percent / 100, // Konvertiere zu Dezimal
        discount_percent: discountData.discount_percent,
        duration_hours: discountData.duration_hours,
        is_active: discountData.is_active,
        start_time: discountData.start_time,
        end_time: discountData.end_time,
        time_remaining: discountData.time_remaining,
        created_by: discountData.created_by,
        notes: discountData.notes
      }
    }
  } catch (error) {
    console.error("Error getting god pack discount:", error)
    return { success: false, data: null }
  }
}

export async function activateGodPackDiscount(
  discountPercent: number = 20, 
  durationHours: number = 24,
  createdBy: string = 'admin',
  notes?: string
) {
  try {
    const supabase = createSupabaseServer()
    
    // Verwende die neue Funktion mit der god_pack_discounts Tabelle
    const { data, error } = await supabase
      .rpc('activate_god_pack_discount', {
        p_discount_percent: discountPercent,
        p_duration_hours: durationHours,
        p_created_by: createdBy,
        p_notes: notes
      })

    if (error) {
      console.error("Error activating god pack discount:", error)
      return { success: false, error: error.message }
    }

    console.log("God pack discount activated successfully:", {
      discountPercent,
      durationHours,
      createdBy,
      notes
    })

    return { success: true }
  } catch (error) {
    console.error("Error in activateGodPackDiscount:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deactivateGodPackDiscount() {
  try {
    const supabase = createSupabaseServer()
    
    // Verwende die neue Funktion
    const { data, error } = await supabase
      .rpc('deactivate_god_pack_discount')

    if (error) {
      console.error("Error deactivating god pack discount:", error)
      return { success: false, error: error.message }
    }

    console.log("God pack discount deactivated successfully")
    return { success: true }
  } catch (error) {
    console.error("Error in deactivateGodPackDiscount:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Debug function to check current god pack discount status
export async function debugGodPackDiscount() {
  try {
    const supabase = createSupabaseServer()
    
    // Hole alle God Pack Rabatte (nicht nur aktive)
    const { data, error } = await supabase
      .from("god_pack_discounts")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    // Hole auch den aktiven Rabatt
    const { data: activeData, error: activeError } = await supabase
      .rpc('get_active_god_pack_discount')

    const now = new Date()
    
    return {
      success: true,
      data: {
        allDiscounts: data || [],
        activeDiscount: activeData && activeData.length > 0 ? activeData[0] : null,
        currentTime: now.toISOString(),
        totalDiscounts: data ? data.length : 0,
        activeCount: activeData ? activeData.length : 0
      }
    }
  } catch (error) {
    console.error("Error in debugGodPackDiscount:", error)
    return { success: false, error: "An unexpected error occurred", data: null }
  }
}

// Zusätzliche Funktionen für erweiterte Verwaltung
export async function getGodPackDiscountHistory() {
  try {
    const supabase = createSupabaseServer()
    
    const { data, error } = await supabase
      .from("god_pack_discounts")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error getting discount history:", error)
    return { success: false, error: "An unexpected error occurred", data: null }
  }
}

export async function cleanupExpiredGodPackDiscounts() {
  try {
    const supabase = createSupabaseServer()
    
    const { data, error } = await supabase
      .rpc('cleanup_expired_god_pack_discounts')

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data: { cleanedCount: data } }
  } catch (error) {
    console.error("Error cleaning up expired discounts:", error)
    return { success: false, error: "An unexpected error occurred", data: null }
  }
}
