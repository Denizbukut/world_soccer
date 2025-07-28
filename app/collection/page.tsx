"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, BookOpen, Search, Filter } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import MobileNav from "@/components/mobile-nav"
import { Input } from "@/components/ui/input"
import { renderStars } from "@/utils/card-stars"
import { LevelSystemInfoDialog } from "@/components/level-system-info-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image";

export default function CollectionPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEpoch, setSelectedEpoch] = useState<number | "all">("all")
  const [availableEpochs, setAvailableEpochs] = useState<number[]>([])
  const [showSquad, setShowSquad] = useState(false);
  // Squad-Positions-State
  const initialSquad: Record<string, any> = {
    GK: null,
    DF1: null, DF2: null, DF3: null, DF4: null,
    MF1: null, MF2: null, MF3: null, MF4: null,
    FW1: null, FW2: null,
  };
  const [squad, setSquad] = useState<Record<string, any>>(initialSquad);
  const [selectingPosition, setSelectingPosition] = useState<string | null>(null); // z.B. 'DF2'
  const [savingSquad, setSavingSquad] = useState(false);

  // Squad aus API laden, wenn My Squad geöffnet wird
  useEffect(() => {
    if (!showSquad || !user?.username) return;
    async function fetchSquad() {
      try {
        const res = await fetch("/api/save-squad", { method: "GET", credentials: "include" });
        const data = await res.json();
        if (data.squad) {
          // Die Squad-Objekte enthalten nur Card-IDs, wir müssen die Card-Objekte aus userCards zuordnen
          const newSquad: Record<string, any> = { ...initialSquad };
          Object.entries(data.squad).forEach(([slot, cardId]) => {
            if (cardId) {
              const cardObj = userCards.find((c) => c.cardId === cardId);
              if (cardObj) newSquad[slot] = cardObj;
            }
          });
          setSquad(newSquad);
        } else {
          setSquad(initialSquad);
        }
      } catch (e) {
        setSquad(initialSquad);
      }
    }
    fetchSquad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSquad, user?.username, userCards]);

  // Fetch user's cards
  useEffect(() => {
    async function fetchUserCards() {
      if (!user?.username) return

      setLoading(true)
      const supabase = getSupabaseBrowserClient()

      try {
        // 1. First get user's cards
        if (!supabase) return
        const { data: userCardsData, error: userCardsError } = await supabase
          .from("user_cards")
          .select(`id, card_id, quantity, level`)
          .eq("user_id", user.username)
          .gt("quantity", 0)

        if (userCardsError) {
          console.error("Error fetching user cards:", userCardsError)
          toast({
            title: "Error",
            description: "Failed to load your card collection",
            variant: "destructive",
          })
          setUserCards([])
          setLoading(false)
          return
        }

        if (!userCardsData || userCardsData.length === 0) {
          setUserCards([])
          setLoading(false)
          return
        }

        // 2. Get the card IDs to fetch
        const cardIds = userCardsData.map((uc) => uc.card_id)

        // 3. Fetch the card details including epoch
        const { data: cardsData, error: cardsError } = await supabase
          .from("cards")
          .select("id, name, character, image_url, rarity, epoch")
          .in("id", cardIds)

        if (cardsError) {
          console.error("Error fetching card details:", cardsError)
          toast({
            title: "Error",
            description: "Failed to load card details",
            variant: "destructive",
          })
          setUserCards([])
          setLoading(false)
          return
        }

        const cardMap = new Map()
        cardsData?.forEach((c) => {
          cardMap.set(c.id, c)
        })

        // 4. Get available epochs from user's cards
        const epochs = [...new Set(cardsData?.map((card) => card.epoch).filter(Boolean))] as number[]
        setAvailableEpochs(epochs.sort((a, b) => b - a)) // Sort newest first

        // 5. Combine the data
        const processedCards = userCardsData
          .map((userCard) => {
            const details = cardMap.get(userCard.card_id)
            if (!details) return null
            return {
              id: userCard.id,
              cardId: userCard.card_id,
              quantity: userCard.quantity,
              level: userCard.level || 1,
              ...details,
              imageUrl: details.image_url, // <-- wichtig für CardItem
            }
          })
          .filter(Boolean)

        setUserCards(processedCards)
      } catch (err) {
        console.error("Unexpected error:", err)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserCards()
  }, [user?.username])

  // Filter cards based on active tab, search term, and epoch
  const filteredCards = userCards.filter((card) => {
    const matchesSearch =
      searchTerm === "" ||
      card.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.character?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRarity = activeTab === "all" || card.rarity === activeTab.toLowerCase()

    const matchesEpoch = selectedEpoch === "all" || card.epoch === selectedEpoch

    return matchesSearch && matchesRarity && matchesEpoch
  })

  // Group cards by level for better organization
  const cardsByLevel = filteredCards.reduce((acc: Record<number, any[]>, card) => {
    const level = card.level || 1
    if (!acc[level]) {
      acc[level] = []
    }
    acc[level].push(card)
    return acc
  }, {})

  // Sort levels in descending order
  const sortedLevels = Object.keys(cardsByLevel)
    .map(Number)
    .sort((a, b) => b - a)

  // Calculate collection stats
  const collectionStats = userCards.reduce(
    (acc, card) => {
      acc.total += card.quantity || 0
      if (card.rarity) {
        acc[card.rarity] = (acc[card.rarity] || 0) + (card.quantity || 0)
      }
      return acc
    },
    { total: 0, common: 0, rare: 0, epic: 0, legendary: 0, goat: 0 },
  )



  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">My Collection</h1>
            </div>
          </div>
        </header>
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm mb-4 p-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="aspect-[3/4]">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  if (userCards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] pb-20">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-medium">My Collection</h1>
            </div>
          </div>
        </header>
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">No Cards Yet</h2>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto">
              You don't have any cards in your collection yet. Open some packs to get started!
            </p>
            <Button
              onClick={() => router.push("/draw")}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-full"
            >
              Open Card Packs
            </Button>
          </div>
        </div>
        <MobileNav />
      </div>
    )
  }

  if (showSquad) {
    // Karten nach Level sortieren (höchster zuerst)
    const sortedUserCards = [...userCards].sort((a, b) => (b.level || 1) - (a.level || 1));
    // My Squad Ansicht
    return (
      <div
        className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black"
        style={{ backgroundImage: 'url(/fußballpaltz.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm w-full">
          <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-green-400 to-green-700 bg-clip-text text-transparent drop-shadow-md">
              4-4-2
            </h1>
            <button onClick={() => setShowSquad(false)} className="text-sm text-gray-600 underline">Back</button>
          </div>
        </header>
        {/* Spielfeld und Formation */}
        <div className="relative w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center py-8">
          {/* 1 Torwart */}
          <div
            className="aspect-[3/4] w-20 sm:w-24 border-2 border-yellow-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0"
            onClick={() => setSelectingPosition('GK')}
          >
            {squad.GK ? (
              <CardItem {...squad.GK} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => {}} style={{ width: '100%', height: '100%' }} />
            ) : null}
          </div>
          {/* 4 Verteidiger */}
          <div className="flex justify-between mb-6 w-4/5 mx-auto">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className="aspect-[3/4] w-20 sm:w-24 border-2 border-blue-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0"
                onClick={() => setSelectingPosition(`DF${i}`)}
              >
                {squad[`DF${i}`] ? (
                  <CardItem {...squad[`DF${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => {}} style={{ width: '100%', height: '100%' }} />
                ) : null}
              </div>
            ))}
          </div>
          {/* 4 Mittelfeld */}
          <div className="flex justify-between mb-6 w-4/5 mx-auto">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className="aspect-[3/4] w-20 sm:w-24 border-2 border-green-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0"
                onClick={() => setSelectingPosition(`MF${i}`)}
              >
                {squad[`MF${i}`] ? (
                  <CardItem {...squad[`MF${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideLevel={true} hideQuantity={true} />
                ) : null}
              </div>
            ))}
          </div>
          {/* 2 Stürmer */}
          <div className="flex justify-center mb-6">
            {[1,2].map(i => (
              <div
                key={i}
                className="aspect-[3/4] w-20 sm:w-24 border-2 border-red-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0"
                onClick={() => setSelectingPosition(`FW${i}`)}
              >
                {squad[`FW${i}`] ? (
                  <CardItem {...squad[`FW${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideLevel={true} hideQuantity={true} />
                ) : null}
              </div>
            ))}
          </div>
          {/* Platzhalter für Drag&Drop oder Kartenauswahl */}
          <div className="mt-8 text-white text-center">Hier kannst du später deine Karten in die Formation ziehen oder auswählen.</div>

          {/* Save Squad Button */}
          <button
            className="mt-8 px-6 py-3 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 transition disabled:opacity-60"
            onClick={async () => {
              setSavingSquad(true);
              // Nur die Card-IDs speichern
              const squadToSave: Record<string, string | null> = {};
              Object.entries(squad).forEach(([slot, cardObj]) => {
                squadToSave[slot] = cardObj ? cardObj.cardId : null;
              });
              // Validierung: Keine Karte doppelt im Team
              const cardIds = Object.values(squadToSave).filter(Boolean);
              const hasDuplicates = new Set(cardIds).size !== cardIds.length;
              if (hasDuplicates) {
                toast({ title: "Fehler", description: "Du hast dieselbe Karte mehrfach im Team!", variant: "destructive" });
                setSavingSquad(false);
                return;
              }
              console.log('Squad to save:', squadToSave);
              const res = await fetch("/api/save-squad", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ squad: squadToSave }),
                credentials: "include"
              });
              const data = await res.json();
              setSavingSquad(false);
              console.log("Save Squad Response:", data);
              if (res.ok && data.success) {
                toast({ title: "Squad gespeichert!", description: JSON.stringify(data) });
              } else {
                toast({ title: "Fehler", description: JSON.stringify(data), variant: "destructive" });
              }
            }}
            disabled={savingSquad}
          >
            {savingSquad ? "Speichern..." : "Save Squad"}
          </button>

          {/* Auswahlmenü für Karten */}
          {selectingPosition && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-xs w-full shadow-lg">
                <h2 className="text-lg font-bold mb-4">Karte für {selectingPosition} wählen</h2>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {sortedUserCards.map(card => {
                    // Prüfen, ob die Karte schon in einer anderen Position ist
                    const alreadyInSquad = Object.entries(squad).some(
                      ([slot, c]) => c && c.cardId === card.cardId && slot !== selectingPosition
                    );
                    // Key eindeutig machen:
                    const uniqueKey = card.cardId + '-' + selectingPosition;
                    return (
                      <button
                        key={uniqueKey}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded border mb-1 ${alreadyInSquad ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 'hover:bg-green-100 border-gray-200'}`}
                        onClick={() => {
                          if (alreadyInSquad) return;
                          setSquad(prev => ({ ...prev, [selectingPosition]: card }));
                          setSelectingPosition(null);
                        }}
                        disabled={alreadyInSquad}
                      >
                        <div className="w-10 h-14 flex-shrink-0 overflow-hidden rounded">
                          {card ? <CardItem {...card} compact /> : null}
                        </div>
                        <span className="flex-1">{card.name} ({card.character})</span>
                        <span className="flex items-center text-xs text-yellow-500 ml-2">
                          ★ {card.level}
                        </span>
                        {alreadyInSquad && <span className="ml-2 text-xs text-red-400 font-semibold">Bereits im Team</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="mt-4 w-full py-2 bg-red-200 text-red-700 rounded font-bold"
                  onClick={() => {
                    setSquad(prev => ({ ...prev, [selectingPosition]: null }));
                    setSelectingPosition(null);
                  }}
                >
                  Karte entfernen
                </button>
                <button className="mt-4 w-full py-2 bg-gray-200 rounded" onClick={() => setSelectingPosition(null)}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normale Collection-Ansicht
  return (
    <div className="min-h-screen bg-[#f8f9ff] pb-20">
      {/* Header mit My Collection und My Squad */}
      <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between sticky top-0 z-30 bg-white/90 border-b border-gray-100 shadow-sm">
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-md">
          My Collection
        </h1>
        <button
          onClick={() => setShowSquad(true)}
          className="ml-4 px-4 py-2 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
        >
          My Squad
        </button>
      </div>

      <main className="p-4 max-w-lg mx-auto">
        {/* Collection Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium">Collection Stats</h2>
              <Link href="/catalog">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white h-7 px-3 shadow-sm"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">Cards Gallery</span>
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Total", value: collectionStats.total, color: "text-gray-600" },
                { label: "Basic", value: collectionStats.common, color: "text-gray-600" },
                { label: "Rare", value: collectionStats.rare, color: "text-blue-600" },
                { label: "Elite", value: collectionStats.epic, color: "text-purple-600" },
                { label: "Legend", value: collectionStats.legendary, color: "text-amber-600" },
                { label: "GOAT", value: collectionStats.goat, color: "text-[#b91c1c]" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-2">
                  <div className={`text-lg font-semibold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Level System Info Button - Now positioned below the stats grid */}
            <div className="mt-3 flex justify-center">
              <LevelSystemInfoDialog />
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-4 space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search cards..."
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Epoch Filter */}
          {availableEpochs.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select
                value={selectedEpoch.toString()}
                onValueChange={(value) => setSelectedEpoch(value === "all" ? "all" : Number.parseInt(value))}
              >
                <SelectTrigger className="w-32 bg-white">
                  <SelectValue placeholder="Epoch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Epochs</SelectItem>
                  {availableEpochs.map((epoch) => (
                    <SelectItem key={epoch} value={epoch.toString()}>
                      Epoch {epoch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 bg-white h-9">
              <TabsTrigger value="all" className="text-xs h-7">
                All
              </TabsTrigger>
              <TabsTrigger value="goat" className="text-xs h-7">
                GOAT
              </TabsTrigger>
              <TabsTrigger value="legendary" className="text-xs h-7">
                Legendary
              </TabsTrigger>
              <TabsTrigger value="epic" className="text-xs h-7">
                Elite
              </TabsTrigger>
              <TabsTrigger value="rare" className="text-xs h-7">
                Rare
              </TabsTrigger>
              <TabsTrigger value="common" className="text-xs h-7">
                Basic
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Cards by Level */}
        {sortedLevels.length > 0 ? (
          sortedLevels.map((level) => (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center mb-3">
                <Badge variant="outline" className="mr-2 font-bold">
                  Level {level}
                </Badge>
                <div className="flex">{renderStars(level, "xs")}</div>
                <span className="ml-2 text-sm text-gray-700">
                  ({cardsByLevel[level].length} {cardsByLevel[level].length === 1 ? "card" : "cards"})
                </span>
              </div>

              <motion.div
                className="grid grid-cols-3 sm:grid-cols-4 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05 }}
              >
                <AnimatePresence>
                  {cardsByLevel[level].map((card) => {
                    console.log('CollectionCard', card.imageUrl, card.image_url);
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <CardItem
                          id={`${card.cardId}`}
                          name={card.name}
                          character={card.character}
                          imageUrl={card.imageUrl}
                          rarity={card.rarity}
                          level={card.level || 1}
                          quantity={card.quantity}
                          owned={true}
                          isCollection={true}
                          epoch={card.epoch}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h2 className="text-lg font-medium mb-2">No Results</h2>
            <p className="text-gray-500 mb-4">
              No cards match your search criteria. Try different keywords or filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setActiveTab("all")
                setSelectedEpoch("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <MobileNav />
      <button
        onClick={() => setShowSquad(true)}
        className="mt-8 px-6 py-3 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 transition"
      >
        My Squad
      </button>
    </div>
  )
}
