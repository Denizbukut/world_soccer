"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Users, Trophy, XCircle, Info, AlertCircle } from "lucide-react"

interface ClanMember {
  id: string
  username: string
  level: number
  is_founder: boolean
}

interface ClanActivity {
  id: number
  activity_type: string
  description: string
  user_id: string | null
  username: string | null
  created_at: string
}

interface ClanDetails {
  id: number
  name: string
  description: string | null
  level: number
  xp: number
  xp_needed: number
  created_at: string
  founder_id: string
  founder_name: string
  member_count: number
}

interface ClanLevel {
  level: number
  required_xp: number
  reward: string
}

export default function ClanPage() {
  const params = useParams()
  const id = params?.id ? String(params.id) : ""
  const router = useRouter()
  const { user } = useAuth()
  const [clan, setClan] = useState<ClanDetails | null>(null)
  const [members, setMembers] = useState<ClanMember[]>([])
  const [activities, setActivities] = useState<ClanActivity[]>([])
  const [isUserMember, setIsUserMember] = useState(false)
  const [isUserFounder, setIsUserFounder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [memberLoading, setMemberLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [kickMemberDialog, setKickMemberDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null)
  const [showLevelInfo, setShowLevelInfo] = useState(false)

  // Clan level rewards table
  const clanLevels: ClanLevel[] = [
    { level: 1, required_xp: 0, reward: "Clan gegründet" },
    { level: 2, required_xp: 500, reward: "+1 Ticket pro Woche für alle" },
    { level: 3, required_xp: 1500, reward: "+5 % Coins beim Kartenverkauf" },
    { level: 4, required_xp: 3000, reward: "Clan-Frame für Profilbilder" },
    { level: 5, required_xp: 5000, reward: "Wöchentliches Clan-Pack mit garantiertem Rare" },
    { level: 6, required_xp: 8000, reward: "Clan-Pin als kosmetisches Item" },
    { level: 7, required_xp: 12000, reward: "Zugang zu Clan-Special-Packs" },
    { level: 8, required_xp: 17000, reward: "Leader erhält extra Paket" },
    { level: 9, required_xp: 23000, reward: "Clan-Missionssystem wird freigeschaltet" },
    { level: 10, required_xp: 30000, reward: "Wöchentlicher SSR-Ticket-Drop möglich" },
  ]

  useEffect(() => {
    if (id) {
      fetchClanDetails()
    }
  }, [id, user])

  const fetchClanDetails = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Fetch clan details
      const { data: clanData, error: clanError } = await supabase
        .from("clans")
        .select("*")
        .eq("id", String(id))
        .single()

      if (clanError || !clanData) {
        console.error("Error fetching clan:", clanError)
        toast({
          title: "Error",
          description: "Clan nicht gefunden",
          variant: "destructive",
        })
        router.push("/clan/browse")
        return
      }

      // Get founder's username
      const { data: founderData, error: founderError } = await supabase
        .from("users")
        .select("username")
        .eq("username", String(clanData.founder_id))
        .single()

      const founderName = founderError ? "Unbekannt" : String(founderData?.username || "Unbekannt")

      setClan({
        ...clanData,
        id: Number(clanData.id),
        name: String(clanData.name),
        description: clanData.description ? String(clanData.description) : null,
        level: typeof clanData.level === "number" ? clanData.level : 1,
        xp: typeof clanData.xp === "number" ? clanData.xp : 0,
        xp_needed: typeof clanData.xp_needed === "number" ? clanData.xp_needed : 500,
        created_at: String(clanData.created_at),
        founder_id: String(clanData.founder_id),
        founder_name: founderName,
        member_count: typeof clanData.member_count === "number" ? clanData.member_count : 0,
      })

      // Check if current user is a member or founder
      if (user) {
        const isFounder = user.username === clanData.founder_id
        setIsUserFounder(isFounder)

        // Fetch user's clan_id to check membership
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("clan_id")
          .eq("username", user.username)
          .single()

        if (!userError && userData && userData.clan_id === Number(id)) {
          setIsUserMember(true)
        } else {
          setIsUserMember(false)
        }
      }

      // Now fetch members and activities
      fetchClanMembers()
      fetchClanActivities()
    } catch (error) {
      console.error("Error in fetchClanDetails:", error)
      toast({
        title: "Error",
        description: "Fehler beim Laden der Clan-Details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClanMembers = async () => {
    setMemberLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase || !id) return

    try {
      // Fetch clan members
      const { data: membersData, error: membersError } = await supabase
        .from("users")
        .select("username, level, clan_id")
        .eq("clan_id", String(id))

      if (membersError) {
        console.error("Error fetching members:", membersError)
        toast({
          title: "Error",
          description: "Fehler beim Laden der Mitglieder",
          variant: "destructive",
        })
        return
      }

      if (membersData && clan) {
        const formattedMembers = membersData.map((member) => ({
          id: String(member.username),
          username: String(member.username),
          level: typeof member.level === "number" ? member.level : 1,
          is_founder: member.username === clan.founder_id,
        }))

        setMembers(formattedMembers)
      }
    } catch (error) {
      console.error("Error in fetchClanMembers:", error)
    } finally {
      setMemberLoading(false)
    }
  }

  const fetchClanActivities = async () => {
    setActivityLoading(true)
    const supabase = getSupabaseBrowserClient()
    if (!supabase || !id) return

    try {
      // Fetch clan activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("clan_activities")
        .select(`
          id,
          activity_type,
          description,
          user_id,
          created_at
        `)
        .eq("clan_id", String(id))
        .order("created_at", { ascending: false })
        .limit(20)

      if (activitiesError) {
        console.error("Error fetching activities:", activitiesError)
        return
      }

      if (activitiesData) {
        // Get all unique user IDs from activities
        const userIds = [...new Set(activitiesData.filter((a) => a.user_id).map((a) => a.user_id))]

        // Fetch usernames for these IDs
        const usernamesMap: Record<string, string> = {}

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("username")
            .in("username", userIds as string[])

          if (!usersError && usersData) {
            usersData.forEach((u) => {
              if (u.username && typeof u.username === "string") {
                usernamesMap[u.username] = String(u.username)
              }
            })
          }
        }

        // Format activities with usernames
        const formattedActivities = activitiesData.map((activity) => ({
          id: Number(activity.id),
          activity_type: String(activity.activity_type),
          description: String(activity.description),
          user_id: activity.user_id ? String(activity.user_id) : null,
          username:
            activity.user_id && typeof activity.user_id === "string" && activity.user_id in usernamesMap
              ? usernamesMap[activity.user_id]
              : null,
          created_at: String(activity.created_at),
        }))

        setActivities(formattedActivities)
      }
    } catch (error) {
      console.error("Error in fetchClanActivities:", error)
    } finally {
      setActivityLoading(false)
    }
  }

  const joinClan = async () => {
    if (!user || !clan) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Update user's clan_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ clan_id: clan.id })
        .eq("username", user.username)

      if (updateError) {
        console.error("Error joining clan:", updateError)
        toast({
          title: "Error",
          description: "Fehler beim Beitreten des Clans",
          variant: "destructive",
        })
        return
      }

      // Update clan member count
      const { error: clanUpdateError } = await supabase
        .from("clans")
        .update({ member_count: clan.member_count + 1 })
        .eq("id", String(clan.id))

      if (clanUpdateError) {
        console.error("Error updating clan member count:", clanUpdateError)
      }

      // Add activity
      await supabase.from("clan_activities").insert({
        clan_id: clan.id,
        activity_type: "join",
        description: `${user.username} ist dem Clan beigetreten`,
        user_id: user.username,
        created_at: new Date().toISOString(),
      })

      // Refresh data
      toast({
        title: "Erfolg",
        description: "Du bist dem Clan beigetreten",
      })

      fetchClanDetails()
      setIsUserMember(true)
    } catch (error) {
      console.error("Error in joinClan:", error)
      toast({
        title: "Error",
        description: "Fehler beim Beitreten des Clans",
        variant: "destructive",
      })
    }
  }

  const leaveClan = async () => {
    if (!user || !clan || isUserFounder) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Update user's clan_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ clan_id: null })
        .eq("username", user.username)

      if (updateError) {
        console.error("Error leaving clan:", updateError)
        toast({
          title: "Error",
          description: "Fehler beim Verlassen des Clans",
          variant: "destructive",
        })
        return
      }

      // Update clan member count
      const { error: clanUpdateError } = await supabase
        .from("clans")
        .update({ member_count: Math.max(1, clan.member_count - 1) })
        .eq("id", String(clan.id))

      if (clanUpdateError) {
        console.error("Error updating clan member count:", clanUpdateError)
      }

      // Add activity
      await supabase.from("clan_activities").insert({
        clan_id: clan.id,
        activity_type: "leave",
        description: `${user.username} hat den Clan verlassen`,
        user_id: user.username,
        created_at: new Date().toISOString(),
      })

      toast({
        title: "Erfolg",
        description: "Du hast den Clan verlassen",
      })

      // Redirect to clan browse page
      router.push("/clan/browse")
    } catch (error) {
      console.error("Error in leaveClan:", error)
      toast({
        title: "Error",
        description: "Fehler beim Verlassen des Clans",
        variant: "destructive",
      })
    }
  }

  const handleKickMember = (member: ClanMember) => {
    if (isUserFounder && !member.is_founder) {
      setSelectedMember(member)
      setKickMemberDialog(true)
    }
  }

  const confirmKickMember = async () => {
    if (!selectedMember || !clan) return

    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    try {
      // Update user's clan_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ clan_id: null })
        .eq("username", selectedMember.username)

      if (updateError) {
        console.error("Error kicking member:", updateError)
        toast({
          title: "Error",
          description: "Fehler beim Entfernen des Mitglieds",
          variant: "destructive",
        })
        return
      }

      // Update clan member count
      const { error: clanUpdateError } = await supabase
        .from("clans")
        .update({ member_count: Math.max(1, clan.member_count - 1) })
        .eq("id", String(clan.id))

      if (clanUpdateError) {
        console.error("Error updating clan member count:", clanUpdateError)
      }

      // Add activity
      await supabase.from("clan_activities").insert({
        clan_id: clan.id,
        activity_type: "kick",
        description: `${selectedMember.username} wurde aus dem Clan entfernt`,
        user_id: user?.username,
        created_at: new Date().toISOString(),
      })

      toast({
        title: "Erfolg",
        description: `${selectedMember.username} wurde aus dem Clan entfernt`,
      })

      // Refresh data
      setKickMemberDialog(false)
      setSelectedMember(null)
      fetchClanMembers()
      fetchClanActivities()

      // Update clan details to reflect new member count
      if (clan) {
        setClan({
          ...clan,
          member_count: Math.max(1, clan.member_count - 1),
        })
      }
    } catch (error) {
      console.error("Error in kickMember:", error)
      toast({
        title: "Error",
        description: "Fehler beim Entfernen des Mitglieds",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Clan-Details...</p>
        </div>
      </div>
    )
  }

  if (!clan) {
    return (
      <div className="container mx-auto p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Clan nicht gefunden</h2>
        <p className="text-muted-foreground mb-4">Der gesuchte Clan existiert nicht oder wurde gelöscht.</p>
        <Button onClick={() => router.push("/clan/browse")}>Zurück zur Clan-Übersicht</Button>
      </div>
    )
  }

  // Calculate progress to next level
  const currentLevelIndex = clanLevels.findIndex((l) => l.level === clan.level)
  const nextLevel = clanLevels[currentLevelIndex + 1]
  const progressPercentage = nextLevel ? ((clan.xp / nextLevel.required_xp) * 100).toFixed(0) : "100"

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="md:w-1/3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                  {clan.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{clan.name}</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      Level {clan.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {clan.member_count} {clan.member_count === 1 ? "Mitglied" : "Mitglieder"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium">Gründer:</p>
                    <p className="text-sm">{clan.founder_name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowLevelInfo(true)}>
                    <Info className="h-4 w-4 mr-1" />
                    <span className="text-xs">Level-Info</span>
                  </Button>
                </div>
              </div>

              <p className="mb-4">{clan.description || "Keine Beschreibung vorhanden."}</p>

              {nextLevel && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Fortschritt zu Level {clan.level + 1}</span>
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">{clan.xp} XP</span>
                    <span className="text-muted-foreground">{nextLevel.required_xp} XP</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-4">
                Gegründet am {new Date(clan.created_at).toLocaleDateString()}
              </p>

              {user && !isUserMember && (
                <Button className="w-full" onClick={joinClan}>
                  Clan beitreten
                </Button>
              )}

              {user && isUserMember && !isUserFounder && (
                <Button variant="destructive" className="w-full" onClick={leaveClan}>
                  Clan verlassen
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:w-2/3">
          <Tabs defaultValue="members">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Mitglieder
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                <Shield className="h-4 w-4 mr-2" />
                Aktivitäten
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex-1">
                <Trophy className="h-4 w-4 mr-2" />
                Belohnungen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Mitglieder ({clan.member_count})</CardTitle>
                </CardHeader>
                <CardContent>
                  {memberLoading ? (
                    <div className="text-center py-8">
                      <div className="h-6 w-6 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Lade Mitglieder...</p>
                    </div>
                  ) : members.length > 0 ? (
                    <div className="space-y-4">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-medium">
                              {member.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{member.username}</p>
                              <p className="text-sm text-muted-foreground">Level {member.level}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.is_founder && (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Gründer</Badge>
                            )}
                            {isUserFounder && !member.is_founder && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleKickMember(member)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                <span className="text-xs">Entfernen</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Keine Mitglieder gefunden</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="text-center py-8">
                      <div className="h-6 w-6 border-4 border-t-transparent border-primary rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Lade Aktivitäten...</p>
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between">
                            <p>
                              {activity.username ? <span className="font-medium">{activity.username}</span> : "System"}{" "}
                              {activity.description}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Keine Aktivitäten gefunden</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards">
              <Card>
                <CardHeader>
                  <CardTitle>Clan-Level Belohnungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Benötigte XP</TableHead>
                        <TableHead>Belohnung</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clanLevels.map((levelInfo) => (
                        <TableRow key={levelInfo.level}>
                          <TableCell className="font-medium">{levelInfo.level}</TableCell>
                          <TableCell>{levelInfo.required_xp.toLocaleString()}</TableCell>
                          <TableCell>{levelInfo.reward}</TableCell>
                          <TableCell className="text-right">
                            {clan.level >= levelInfo.level ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Freigeschaltet</Badge>
                            ) : (
                              <Badge variant="outline">Gesperrt</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Kick Member Dialog */}
      <Dialog open={kickMemberDialog} onOpenChange={setKickMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitglied entfernen</DialogTitle>
            <DialogDescription>
              Bist du sicher, dass du {selectedMember?.username} aus dem Clan entfernen möchtest? Diese Aktion kann
              nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickMemberDialog(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={confirmKickMember}>
              Entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level Info Dialog */}
      <Dialog open={showLevelInfo} onOpenChange={setShowLevelInfo}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clan-Level und Belohnungen</DialogTitle>
            <DialogDescription>
              Mit jedem Level schaltet dein Clan neue Belohnungen und Funktionen frei.
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Benötigte XP (total)</TableHead>
                <TableHead>Belohnung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clanLevels.map((levelInfo) => (
                <TableRow key={levelInfo.level} className={clan.level === levelInfo.level ? "bg-secondary/30" : ""}>
                  <TableCell className="font-medium">{levelInfo.level}</TableCell>
                  <TableCell>{levelInfo.required_xp.toLocaleString()}</TableCell>
                  <TableCell>{levelInfo.reward}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button onClick={() => setShowLevelInfo(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
