"use client"

import { useState, useEffect } from "react"
import MobileNav from "@/components/mobile-nav";
import { useAuth } from "@/contexts/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Users, Trophy, Star, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import CardItem from "@/components/card-item";
import SquadCardMenu from "@/components/squad-card-menu";
import { toast } from "@/components/ui/use-toast";
import WeekendLeagueCountdown from "@/components/weekend-league-countdown";
import QualificationMatches from "@/components/qualification-matches";

interface UserTeam {
  id: string;
  user_id: string;
  slot_0?: string; // GK
  slot_1?: string; // DF1
  slot_2?: string; // DF2
  slot_3?: string; // DF3
  slot_4?: string; // DF4
  slot_5?: string; // MF1
  slot_6?: string; // MF2
  slot_7?: string; // MF3
  slot_8?: string; // MF4
  slot_9?: string; // FW1
  slot_10?: string; // FW2
  updated_at?: string;
}

interface Card {
  id: string;
  name: string;
  overall_rating: number;
  rarity: string;
}

export default function KickOffPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [teamCards, setTeamCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [showSquad, setShowSquad] = useState(false);
  
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
  const [prestigePoints, setPrestigePoints] = useState(100);

  useEffect(() => {
    if (user?.username) {
      fetchUserTeam();
      fetchUserCards();
      fetchPrestigePoints();
    }
  }, [user?.username]);

  // Refresh prestige points when returning from battle
  useEffect(() => {
    if (user?.username) {
      fetchPrestigePoints();
    }
  }, [user?.username, pathname]);

  // Load squad from API when showSquad is true
  useEffect(() => {
    if (!showSquad || !user?.username) return;
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
  }, [showSquad, user?.username, userCards]);

  const fetchUserCards = async () => {
    if (!user?.username) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data: userCardsData, error: userCardsError } = await supabase
        .from("user_cards")
        .select("id, user_id, card_id, quantity, level")
        .eq("user_id", user.username)
        .gt("quantity", 0);

      if (userCardsError) {
        console.error("Error fetching user cards:", userCardsError);
        setUserCards([]);
        return;
      }

      if (!userCardsData || userCardsData.length === 0) {
        setUserCards([]);
        return;
      }

      // Deduplicate user cards by card_id and level
      const uniqueUserCards = userCardsData.reduce((acc, current) => {
        const existingCard = acc.find(card => card.card_id === current.card_id && card.level === current.level);
        if (!existingCard) {
          acc.push(current);
        }
        return acc;
      }, [] as typeof userCardsData);

      // Get card details including position
      const cardIds = uniqueUserCards.map((uc) => uc.card_id);
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("id, name, character, image_url, rarity, epoch, position")
        .in("id", cardIds);

      if (cardsError) {
        console.error("Error fetching card details:", cardsError);
        setUserCards([]);
        return;
      }

      const cardMap = new Map();
      cardsData?.forEach((c) => {
        cardMap.set(c.id, c);
      });

      const combinedCards = uniqueUserCards.map((userCard) => {
        const cardData = cardMap.get(userCard.card_id);
        const position = cardData?.position || "MF"; // Default to MF if no position
        
        return {
          ...userCard,
          cardId: userCard.card_id,
          name: cardData?.name || "Unknown Card",
          character: cardData?.character || "Unknown Character",
          imageUrl: cardData?.image_url || "",
          rarity: cardData?.rarity || "common",
          epoch: cardData?.epoch || 1,
          position: position, // Include position field
        };
      });

      setUserCards(combinedCards);
    } catch (error) {
      console.error("Error:", error);
      setUserCards([]);
    }
  };

  const fetchUserTeam = async () => {
    if (!user?.username) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("user_team")
        .select("*")
        .eq("user_id", user.username)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user team:", error);
      } else {
        setUserTeam(data as unknown as UserTeam);
        
        // Fetch team cards if team exists
        if (data) {
          await fetchTeamCards(data as unknown as UserTeam);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamCards = async (team: UserTeam) => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      // Get all card IDs from team slots (exclude non-slot fields)
      const cardIds = Object.entries(team)
        .filter(([key, value]) => key.startsWith('slot_') && typeof value === 'string' && value)
        .map(([key, value]) => value as string);

      console.log("Team slots:", team);
      console.log("Card IDs found:", cardIds);

      if (cardIds.length === 0) {
        console.log("No card IDs found in team");
        setTeamCards([]);
        return;
      }

      // Fetch card details
      const { data: cardsData, error } = await supabase
        .from("cards")
        .select("id, name, overall_rating, rarity")
        .in("id", cardIds);

      if (error) {
        console.error("Error fetching team cards:", error);
        setTeamCards([]);
      } else {
        console.log("Cards loaded:", cardsData);
        setTeamCards((cardsData as Card[]) || []);
      }
    } catch (error) {
      console.error("Error fetching team cards:", error);
      setTeamCards([]);
    }
  };

  const getSlotName = (index: number) => {
    const slotNames = ["GK", "DF1", "DF2", "DF3", "DF4", "MF1", "MF2", "MF3", "MF4", "FW1", "FW2"];
    return slotNames[index] || `Slot ${index}`;
  };

  const getSlotColor = (index: number) => {
    if (index === 0) return "bg-yellow-500"; // GK
    if (index >= 1 && index <= 4) return "bg-blue-500"; // DF
    if (index >= 5 && index <= 8) return "bg-green-500"; // MF
    return "bg-red-500"; // FW
  };

  const calculateTeamRating = () => {
    if (!userTeam || teamCards.length === 0) return 0;
    
    // Filter out cards with null or invalid ratings
    const validCards = teamCards.filter(card => card.overall_rating && card.overall_rating > 0);
    
    if (validCards.length === 0) return 0;
    
    // Calculate average rating from valid card ratings
    const totalRating = validCards.reduce((sum, card) => sum + card.overall_rating, 0);
    const averageRating = totalRating / validCards.length;
    const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
    
    console.log("Valid cards:", validCards.map(c => `${c.name}: ${c.overall_rating}`));
    console.log("Total rating:", totalRating, "Average:", averageRating, "Rounded:", roundedRating);
    return roundedRating;
  };

  const handleMySquadClick = () => {
    router.push("/mysquad");
  };

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

  const handleReplaceCard = async (position: string) => {
    setSelectingPosition(position);
    setSquadMenuOpen(false);
  };

  const handleCardSelect = (card: any) => {
    if (!selectingPosition) return;
    
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

  const fetchPrestigePoints = async () => {
    if (!user?.username) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("users")
        .select("prestige_points")
        .eq("username", user.username)
        .single();

      if (!error && data) {
        setPrestigePoints(data.prestige_points as number || 100);
      }
    } catch (error) {
      console.error("Error fetching prestige points:", error);
    }
  };

  // Filter cards based on position requirements
  const getFilteredCardsForPosition = (position: string, cards: any[]) => {
    let filteredCards = [];
    
    switch (position) {
      case 'GK':
        filteredCards = cards.filter(card => card.position === 'GK');
        break;
      case 'DF1':
      case 'DF2':
      case 'DF3':
      case 'DF4':
        filteredCards = cards.filter(card => card.position === 'DF');
        break;
      case 'MF1':
      case 'MF2':
      case 'MF3':
      case 'MF4':
        filteredCards = cards.filter(card => card.position === 'MF');
        break;
      case 'FW1':
      case 'FW2':
        filteredCards = cards.filter(card => card.position === 'ST');
        break;
      default:
        filteredCards = cards;
    }
    
    return filteredCards;
  };

  const handleFindMatchClick = () => {
    router.push("/battle");
  };

  if (showSquad) {
    // Karten nach Level sortieren (höchster zuerst)
    const sortedUserCards = [...userCards].sort((a, b) => (b.level || 1) - (a.level || 1));
    
    // My Squad Ansicht
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
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1 rounded-full font-bold">
              GK
            </div>
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
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full font-bold">
                  DF
                </div>
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
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full font-bold">
                  MF
                </div>
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
                    <div className="text-red-300">Forward</div>
                  </div>
                )}
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full font-bold">
                  ST
                </div>
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

          {/* Auswahlmenü für Karten */}
          {selectingPosition && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-black/90 border border-yellow-500 rounded-xl p-6 max-w-sm w-full shadow-lg text-white">
                <h2 className="text-lg font-bold mb-4 text-yellow-300">Select Card for {selectingPosition}</h2>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                  {(() => {
                    const filteredCards = getFilteredCardsForPosition(selectingPosition, sortedUserCards);
                    const getPositionName = (pos: string) => {
                      if (pos.startsWith('GK')) return 'Goalkeeper';
                      if (pos.startsWith('DF')) return 'Defender';
                      if (pos.startsWith('MF')) return 'Midfielder';
                      if (pos.startsWith('FW')) return 'Forward';
                      return pos;
                    };
                    const getRequiredPosition = (pos: string) => {
                      if (pos === 'GK') return 'GK';
                      if (pos.startsWith('DF')) return 'DF';
                      if (pos.startsWith('MF')) return 'MF';
                      if (pos.startsWith('FW')) return 'ST';
                      return pos;
                    };
                    
                                         if (filteredCards.length === 0) {
                       return (
                         <div className="text-center py-4 text-yellow-300">
                           <p>No {getPositionName(selectingPosition).toLowerCase()}s available in your collection.</p>
                           <p className="text-sm text-gray-400 mt-1">Only cards with position "{getRequiredPosition(selectingPosition)}" can be placed here.</p>
                         </div>
                       );
                     }
                    return null;
                  })()}
                  {getFilteredCardsForPosition(selectingPosition, sortedUserCards).map((card: any, index: number) => {
                    // Prüfen, ob die Karte schon in einer anderen Position ist
                    const alreadyInSquad = Object.entries(squad).some(
                      ([slot, c]) => c && c.cardId === card.cardId && slot !== selectingPosition
                    );
                    // Key eindeutig machen mit Index um Duplikate zu vermeiden:
                    const uniqueKey = card.cardId + '-' + selectingPosition + '-' + index;
                    return (
                      <button
                        key={uniqueKey}
                        className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-lg border mb-2 transition-colors ${
                          alreadyInSquad 
                            ? 'bg-gray-800/50 text-gray-400 cursor-not-allowed opacity-60 border-gray-600' 
                            : 'hover:bg-yellow-500/20 border-yellow-500/50 text-white hover:border-yellow-400'
                        }`}
                        onClick={() => {
                          if (alreadyInSquad) return;
                          setSquad(prev => ({ ...prev, [selectingPosition]: card }));
                          setSelectingPosition(null);
                        }}
                        disabled={alreadyInSquad}
                      >
                        <div className="w-10 h-14 flex-shrink-0 overflow-hidden rounded">
                          {card ? (
                            <CardItem 
                              {...card} 
                              compact 
                              owned={true}
                              hideOverlay={true}
                              hideName={true}
                              hideQuantity={true}
                              hideLevel={true}
                              style={{ width: '100%', height: '100%' }}
                            />
                          ) : null}
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
                  className="mt-4 w-full py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg font-bold hover:bg-red-500/30 transition-colors"
                  onClick={() => {
                    setSquad(prev => ({ ...prev, [selectingPosition]: null }));
                    setSelectingPosition(null);
                  }}
                >
                  Remove Card
                </button>
                <button 
                  className="mt-2 w-full py-2 bg-gray-500/20 text-gray-300 border border-gray-500/50 rounded-lg hover:bg-gray-500/30 transition-colors" 
                  onClick={() => setSelectingPosition(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Squad Management Menu */}
        <SquadCardMenu
          isOpen={squadMenuOpen}
          onClose={() => setSquadMenuOpen(false)}
          card={selectedCard}
          position={selectedPosition}
          onRemove={handleRemoveCard}
          onReplace={handleReplaceCard}
        />

        <MobileNav />
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-black"
      style={{ 
        backgroundImage: 'url(/hintergrund.webp.webp)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm w-full">
        <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent drop-shadow-md">
            Kick Off
          </h1>
        </div>
      </header>
      
      {/* Content */}
      <div className="pt-4 pb-20">
        {/* My Squad Section */}
        <div className="w-full max-w-3xl mx-auto px-4 py-2 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <h2 className="text-xl md:text-2xl font-bold text-yellow-400 mb-2 drop-shadow-lg">
              My Squad
            </h2>
            <p className="text-sm text-gray-300">
              Your current team formation
            </p>
          </motion.div>

          <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <Users className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                <h3 className="text-lg font-bold text-white mb-2">My Squad</h3>
                <p className="text-sm text-gray-300 mb-4">
                  {userTeam ? "View and manage your current team" : "Create and manage your team"}
                </p>
                
                {userTeam && (
                  <div className="mb-4">
                    {userTeam.updated_at && (
                      <Badge className="bg-orange-500 text-white text-xs mb-4">
                        Last updated: {new Date(userTeam.updated_at).toLocaleDateString()}
                      </Badge>
                    )}
                    
                    {userTeam && teamCards.length > 0 && (
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white font-semibold">
                          Team Rating: {calculateTeamRating()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={() => setShowSquad(true)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg border border-orange-400/30 transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    {userTeam ? "Manage My Squad" : "Create My Squad"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Find Match Card */}
          <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30 mt-4">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <Zap className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <h3 className="text-lg font-bold text-white mb-2">Find Match</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Challenge other players and earn prestige points
                </p>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-white font-semibold">
                    Prestige Points: {prestigePoints}
                  </span>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleFindMatchClick}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg border border-blue-400/30 transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Find Match
                    </span>
                  </Button>
                  
                  <Button
                    onClick={() => router.push("/ani/weekend-league")}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg border border-yellow-400/30 transition-all duration-200"
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Weekend League
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekend League Countdown */}
          <div className="mt-4">
            <WeekendLeagueCountdown />
          </div>
        </div>

        {/* Qualification Matches */}
        <div className="w-full max-w-3xl mx-auto px-4 py-2 mb-4">
          <QualificationMatches />
        </div>
      </div>
      
      {/* Mobile Navigation unten */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <MobileNav />
      </div>
    </div>
  );
}
