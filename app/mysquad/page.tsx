"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import CardItem from "@/components/card-item"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import MobileNav from "@/components/mobile-nav"
import SquadCardMenu from "@/components/squad-card-menu"

export default function MySquadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userCards, setUserCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Squad-Positions-State
  const initialSquad: Record<string, any> = {
    GK: null,
    DF1: null, DF2: null, DF3: null, DF4: null,
    MF1: null, MF2: null, MF3: null, MF4: null,
    FW1: null, FW2: null,
  };
  const [squad, setSquad] = useState<Record<string, any>>(initialSquad);
  const [selectingPosition, setSelectingPosition] = useState<string | null>(null);
  const [savingSquad, setSavingSquad] = useState(false);
  
  // Squad Management Menu State
  const [squadMenuOpen, setSquadMenuOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  // Load user cards
  useEffect(() => {
    console.log("🔄 useEffect triggered");
    console.log("👤 USER OBJECT:", user);
    console.log("👤 USER USERNAME:", user?.username);
    
    if (user?.username) {
      console.log("✅ USERNAME EXISTS, calling fetchUserCards");
      fetchUserCards()
    } else {
      console.log("❌ NO USERNAME, not calling fetchUserCards");
    }
  }, [user?.username])

  const fetchUserCards = async () => {
    if (!user?.username) {
      console.log("❌ NO USER USERNAME:", user);
      return;
    }
    
    console.log("🔍 FETCHING CARDS FOR USER:", user.username);
    
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        console.log("❌ NO SUPABASE CLIENT");
        return;
      }

             // Get user cards first
       const { data: userCardsData, error: userCardsError } = await supabase
         .from("user_cards")
         .select("id, user_id, card_id, quantity, level")
         .eq("user_id", user.username)
         .gt("quantity", 0)

      console.log("📊 USER CARDS DATA:", userCardsData);
      console.log("❌ USER CARDS ERROR:", userCardsError);

      if (userCardsError) {
        console.error("Error fetching user cards:", userCardsError)
        setUserCards([])
        setLoading(false)
        return
      }

      if (!userCardsData || userCardsData.length === 0) {
        console.log("❌ NO USER CARDS FOUND FOR USER:", user.username);
        setUserCards([])
        setLoading(false)
        return
      }

      console.log("✅ FOUND", userCardsData.length, "USER CARDS");

      // Deduplicate user cards by card_id and level
      const uniqueUserCards = userCardsData.reduce((acc, current) => {
        const existingCard = acc.find(card => card.card_id === current.card_id && card.level === current.level)
        if (!existingCard) {
          acc.push(current)
        }
        return acc
      }, [] as typeof userCardsData)

      console.log("🔍 UNIQUE USER CARDS:", uniqueUserCards);

             // Get card details including position
       const cardIds = uniqueUserCards.map((uc) => uc.card_id)
       console.log("🔍 CARD IDs TO FETCH:", cardIds);
       
       const { data: cardsData, error: cardsError } = await supabase
         .from("cards")
         .select("id, name, character, image_url, rarity, epoch, position")
         .in("id", cardIds)

       console.log("📊 CARDS DATA:", cardsData);
       console.log("❌ CARDS ERROR:", cardsError);

       if (cardsError) {
         console.error("Error fetching card details:", cardsError)
         setUserCards([])
         setLoading(false)
         return
       }

       const cardMap = new Map()
       cardsData?.forEach((c) => {
         cardMap.set(c.id, c)
       })

               const combinedCards = uniqueUserCards.map((userCard) => {
          const cardData = cardMap.get(userCard.card_id);
          const position = cardData?.position || "MF"; // Default to MF if no position
          
          console.log(`Loading card: ${cardData?.name || "Unknown"} - Position: ${position} - Card ID: ${userCard.card_id}`);
          
          const combinedCard = {
            ...userCard,
            cardId: userCard.card_id,
            name: cardData?.name || "Unknown Card",
            character: cardData?.character || "Unknown Character",
            imageUrl: cardData?.image_url || "",
            rarity: cardData?.rarity || "common",
            epoch: cardData?.epoch || 1,
            position: position, // Make sure position is included
          };
          
          // Debug: Log the complete card object to verify position is included
          console.log(`CardItem Debug:`, {
            id: combinedCard.id,
            name: combinedCard.name,
            imageUrl: combinedCard.imageUrl,
            cardImageUrl: `https://ani-labs.xyz${combinedCard.imageUrl}`,
            rarity: combinedCard.rarity,
            position: combinedCard.position // Make sure position is included
          });
          
          return combinedCard;
        })

      console.log("✅ FINAL COMBINED CARDS:", combinedCards);
      setUserCards(combinedCards)
    } catch (error) {
      console.error("Error:", error)
      setUserCards([])
    } finally {
      setLoading(false)
    }
  }

  // Load squad from API
  useEffect(() => {
    if (!user?.username) return;
    async function fetchSquad() {
      try {
        const res = await fetch("/api/save-squad", { method: "GET", credentials: "include" });
        const data = await res.json();
        if (data.squad) {
          const newSquad: Record<string, any> = { ...initialSquad };
          Object.entries(data.squad).forEach(([slot, cardId]) => {
            if (cardId) {
              const cardObj = userCards.find((c) => c.cardId === cardId);
              if (cardObj) {
                newSquad[slot] = cardObj;
              }
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
  }, [user?.username, userCards]);

  // Squad Management Functions
  const handleSquadCardClick = (card: any, position: string) => {
    if (!card) {
      console.error("No card provided to handleSquadCardClick");
      return;
    }
    console.log(`Squad card clicked for ${position}:`, card);
    setSelectedCard(card);
    setSelectedPosition(position);
    setSquadMenuOpen(true);
  };

  const handleRemoveCard = async (position: string) => {
    try {
      const newSquad = { ...squad };
      newSquad[position] = null;
      setSquad(newSquad);
      
      // Save to API
      const response = await fetch("/api/save-squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: newSquad }),
        credentials: "include"
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: "Squad updated!", description: "Card removed from squad." });
      } else {
        toast({ title: "Error", description: "Failed to update squad.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error removing card:", error);
      toast({ title: "Error", description: "Failed to remove card.", variant: "destructive" });
    }
  };

  // Function to check if a card can be placed in a specific position
  const canPlaceCardInPosition = (card: any, position: string) => {
    console.log(`Checking position compatibility:`, {
      cardName: card.name,
      cardPosition: card.position,
      targetPosition: position,
      hasPosition: !!card.position
    });
    
    if (!card.position) {
      console.log(`Card ${card.name} has no position defined`);
      return false;
    }
    
    let canPlace = false;
    switch (position) {
      case 'GK':
        canPlace = card.position === 'GK';
        console.log(`GK check: ${card.position} === 'GK' = ${canPlace}`);
        break;
      case 'DF1':
      case 'DF2':
      case 'DF3':
      case 'DF4':
        canPlace = card.position === 'DF';
        console.log(`DF check: ${card.position} === 'DF' = ${canPlace}`);
        break;
      case 'MF1':
      case 'MF2':
      case 'MF3':
      case 'MF4':
        canPlace = card.position === 'MF';
        console.log(`MF check: ${card.position} === 'MF' = ${canPlace}`);
        break;
      case 'FW1':
      case 'FW2':
        canPlace = card.position === 'ST';
        console.log(`FW check: ${card.position} === 'ST' = ${canPlace}`);
        break;
      default:
        canPlace = false;
        console.log(`Default case: position ${position} not recognized`);
    }
    
    console.log(`Position check result: ${card.position} can be placed in ${position} = ${canPlace}`);
    return canPlace;
  };

  const handleCardSelect = (card: any) => {
    if (!selectingPosition) return;
    
    console.log(`Attempting to place card:`, {
      cardName: card.name,
      cardPosition: card.position,
      targetPosition: selectingPosition
    });
    
    // Direct position validation
    let canPlace = false;
    switch (selectingPosition) {
      case 'GK':
        canPlace = card.position === 'GK';
        break;
      case 'DF1':
      case 'DF2':
      case 'DF3':
      case 'DF4':
        canPlace = card.position === 'DF';
        break;
      case 'MF1':
      case 'MF2':
      case 'MF3':
      case 'MF4':
        canPlace = card.position === 'MF';
        break;
      case 'FW1':
      case 'FW2':
        canPlace = card.position === 'ST';
        break;
      default:
        canPlace = false;
    }
    
    if (!canPlace) {
      toast({ 
        title: "Invalid Position", 
        description: `This card (${card.position}) cannot be placed in ${selectingPosition} position.`, 
        variant: "destructive" 
      });
      return;
    }
    
    const newSquad = { ...squad };
    newSquad[selectingPosition] = card;
    setSquad(newSquad);
    setSelectingPosition(null);
  };

  const handleSaveSquad = async () => {
    setSavingSquad(true);
    try {
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
      
      const res = await fetch("/api/save-squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: squadToSave }),
        credentials: "include"
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast({ title: "Squad gespeichert!", description: "Your team has been saved successfully." });
      } else {
        toast({ title: "Fehler", description: "Failed to save squad.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving squad:", error);
      toast({ title: "Error", description: "Failed to save squad.", variant: "destructive" });
    } finally {
      setSavingSquad(false);
    }
  };

     // Get filtered cards for the current position
   const getFilteredCards = () => {
     if (!selectingPosition) return [];
     
     let filtered = [];
     let requiredPosition = '';
     
     // Direct position filtering without complex logic
     switch (selectingPosition) {
       case 'GK':
         filtered = userCards.filter(card => card.position === 'GK');
         requiredPosition = 'GK';
         break;
       case 'DF1':
       case 'DF2':
       case 'DF3':
       case 'DF4':
         filtered = userCards.filter(card => card.position === 'DF');
         requiredPosition = 'DF';
         break;
       case 'MF1':
       case 'MF2':
       case 'MF3':
       case 'MF4':
         filtered = userCards.filter(card => card.position === 'MF');
         requiredPosition = 'MF';
         break;
       case 'FW1':
       case 'FW2':
         filtered = userCards.filter(card => card.position === 'ST');
         requiredPosition = 'ST';
         break;
       default:
         filtered = [];
     }
     
     // Console log when slot is clicked
     console.log(`🎯 SLOT CLICKED: ${selectingPosition}`);
     console.log(`📋 REQUIRED POSITION: ${requiredPosition}`);
     console.log(`✅ COMPATIBLE PLAYERS (${filtered.length}):`, filtered.map(c => `${c.name} (${c.position})`));
     console.log(`📊 ALL USER CARDS (${userCards.length}):`, userCards.map(c => `${c.name} (${c.position})`));
     
     return filtered;
   };

  return (
    <div
      className="relative w-full bg-black min-h-screen"
      style={{ 
        backgroundImage: 'url(/fußballpaltz.jpg)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundRepeat: 'no-repeat' 
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm w-full">
        <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-green-400 to-green-700 bg-clip-text text-transparent drop-shadow-md">
              My Squad
            </h1>
          </div>
        </div>
      </header>

      {/* Squad Builder */}
      <div className="relative w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center py-8">
        {/* 1 Torwart */}
        <div
          className="aspect-[3/4] w-20 sm:w-24 border-2 border-yellow-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0 relative"
          onClick={() => squad.GK && squad.GK.id ? handleSquadCardClick(squad.GK, 'GK') : setSelectingPosition('GK')}
        >
          {squad.GK ? (
            <CardItem {...squad.GK} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => squad.GK && squad.GK.id ? handleSquadCardClick(squad.GK, 'GK') : null} style={{ width: '100%', height: '100%' }} />
          ) : (
            <div className="text-center text-yellow-400 text-xs font-bold">
              <div>GK</div>
              <div className="text-yellow-300">Goalkeeper</div>
            </div>
          )}
        </div>

        {/* 4 Verteidiger */}
        <div className="flex justify-between mb-6 w-4/5 mx-auto">
          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="aspect-[3/4] w-20 sm:w-24 border-2 border-blue-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0 relative"
              onClick={() => squad[`DF${i}`] && squad[`DF${i}`].id ? handleSquadCardClick(squad[`DF${i}`], `DF${i}`) : setSelectingPosition(`DF${i}`)}
            >
              {squad[`DF${i}`] ? (
                <CardItem {...squad[`DF${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => squad[`DF${i}`] && squad[`DF${i}`].id ? handleSquadCardClick(squad[`DF${i}`], `DF${i}`) : null} style={{ width: '100%', height: '100%' }} />
              ) : (
                <div className="text-center text-blue-400 text-xs font-bold">
                  <div>DF{i}</div>
                  <div className="text-blue-300">Defender</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 4 Mittelfeld */}
        <div className="flex justify-between mb-6 w-4/5 mx-auto">
          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="aspect-[3/4] w-20 sm:w-24 border-2 border-green-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0 relative"
              onClick={() => squad[`MF${i}`] && squad[`MF${i}`].id ? handleSquadCardClick(squad[`MF${i}`], `MF${i}`) : setSelectingPosition(`MF${i}`)}
            >
              {squad[`MF${i}`] ? (
                <CardItem {...squad[`MF${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => squad[`MF${i}`] && squad[`MF${i}`].id ? handleSquadCardClick(squad[`MF${i}`], `MF${i}`) : null} style={{ width: '100%', height: '100%' }} />
              ) : (
                <div className="text-center text-green-400 text-xs font-bold">
                  <div>MF{i}</div>
                  <div className="text-green-300">Midfielder</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 2 Stürmer */}
        <div className="flex justify-center mb-6">
          {[1,2].map(i => (
            <div
              key={i}
              className="aspect-[3/4] w-20 sm:w-24 border-2 border-red-400 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer bg-white/10 p-0 relative"
              onClick={() => squad[`FW${i}`] && squad[`FW${i}`].id ? handleSquadCardClick(squad[`FW${i}`], `FW${i}`) : setSelectingPosition(`FW${i}`)}
            >
              {squad[`FW${i}`] ? (
                <CardItem {...squad[`FW${i}`]} compact owned={true} hideOverlay={true} hideName={true} hideQuantity={true} disableCardLink={true} onClick={() => squad[`FW${i}`] && squad[`FW${i}`].id ? handleSquadCardClick(squad[`FW${i}`], `FW${i}`) : null} style={{ width: '100%', height: '100%' }} />
              ) : (
                <div className="text-center text-red-400 text-xs font-bold">
                  <div>FW{i}</div>
                  <div className="text-red-300">Striker</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Squad Button */}
        <button
          className="mt-8 px-6 py-3 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 transition disabled:opacity-60"
          onClick={handleSaveSquad}
          disabled={savingSquad}
        >
          {savingSquad ? "Speichern..." : "Save Squad"}
        </button>
      </div>

      {/* Card Selection Modal - COMPLETELY REWRITTEN */}
      {selectingPosition && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select Card for {selectingPosition}</h3>
            
            {/* Position Info */}
            <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
              <p className="font-semibold text-blue-800">
                {selectingPosition === 'GK' ? 'Goalkeeper (GK)' : 
                  selectingPosition.startsWith('DF') ? 'Defender (DF)' : 
                  selectingPosition.startsWith('MF') ? 'Midfielder (MF)' : 'Striker (ST)'} Position
              </p>
            </div>
            
                         {/* USE getFilteredCards FUNCTION FOR CONSISTENT FILTERING */}
             {(() => {
               const compatibleCards = getFilteredCards();
               
               console.log(`Modal: Compatible cards:`, compatibleCards.map(c => `${c.name} (${c.position})`));
               console.log(`Modal: All user cards:`, userCards.map(c => `${c.name} (${c.position})`));
               
               if (compatibleCards.length > 0) {
                 return (
                   <div>
                     <p className="text-sm text-blue-600 mb-3">
                       {compatibleCards.length} compatible card{compatibleCards.length !== 1 ? 's' : ''} available
                     </p>
                     <div className="grid grid-cols-2 gap-3">
                       {compatibleCards.map((card) => (
                         <div
                           key={card.id}
                           className="cursor-pointer"
                           onClick={() => handleCardSelect(card)}
                         >
                           <CardItem {...card} compact owned={true} />
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               } else {
                 return (
                   <div className="text-center py-4 text-gray-500">
                     <p>No cards available for {selectingPosition} position</p>
                     <p className="text-sm">You need a {selectingPosition === 'GK' ? 'Goalkeeper' : 
                       selectingPosition.startsWith('DF') ? 'Defender' : 
                       selectingPosition.startsWith('MF') ? 'Midfielder' : 'Striker'} card</p>
                   </div>
                 );
               }
             })()}
            
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setSelectingPosition(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Squad Card Menu */}
      <SquadCardMenu
        isOpen={squadMenuOpen}
        onClose={() => setSquadMenuOpen(false)}
        card={selectedCard}
        position={selectedPosition}
        onRemove={handleRemoveCard}
        onReplace={(position) => {
          setSquadMenuOpen(false);
          setSelectingPosition(position);
        }}
      />

      <MobileNav />
    </div>
  )
}
