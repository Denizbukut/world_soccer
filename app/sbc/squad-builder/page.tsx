"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { getSBCChallenges, submitSBCSquad, type SBCChallenge } from "@/app/actions/sbc"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { motion } from "framer-motion"
import { Target, Users, Star, Coins, ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface UserCard {
  id: string
  card_id: string
  quantity: number
  cards: {
    id: string
    name: string
    character: string
    image_url: string
    rarity: string
    type: string
    overall_rating: number
    level: number
  }
}

export default function SquadBuilderPage({ params }: { params?: { challengeId?: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState<SBCChallenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<SBCChallenge | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load challenges
      const challengesData = await getSBCChallenges()
      setChallenges(challengesData)

      // Load user cards
      const supabase = getSupabaseBrowserClient()
      if (supabase && user?.username) {
        const { data: cardsData, error: cardsError } = await supabase
          .from("user_cards")
          .select("id, card_id, quantity")
          .eq("user_id", user.username)
          .gt("quantity", 0)

        if (cardsError) {
          console.error("Error loading user cards:", cardsError)
          setUserCards([])
        } else {
          // Load card details separately
          const cardIds = cardsData?.map(card => card.card_id) || []
          const { data: cardDetails, error: detailsError } = await supabase
            .from("cards")
            .select("id, name, character, image_url, rarity, type, overall_rating, level")
            .in("id", cardIds)

          if (detailsError) {
            console.error("Error loading card details:", detailsError)
            setUserCards([])
          } else {
            // Combine the data
            const combinedCards = cardsData?.map(userCard => {
              const cardDetail = cardDetails?.find(card => card.id === userCard.card_id)
              return {
                id: userCard.id as string,
                card_id: userCard.card_id as string,
                quantity: userCard.quantity as number,
                cards: cardDetail ? {
                  id: cardDetail.id as string,
                  name: cardDetail.name as string,
                  character: cardDetail.character as string,
                  image_url: cardDetail.image_url as string,
                  rarity: cardDetail.rarity as string,
                  type: cardDetail.type as string,
                  overall_rating: cardDetail.overall_rating as number,
                  level: cardDetail.level as number
                } : {
                  id: userCard.card_id as string,
                  name: "Unknown Card",
                  character: "Unknown",
                  image_url: "",
                  rarity: "common",
                  type: "player",
                  overall_rating: 0,
                  level: 1
                }
              }
            }) || []
            setUserCards(combinedCards as UserCard[])
          }
        }
      }

      // Set selected challenge if challengeId is provided
      if (params?.challengeId) {
        const challenge = challengesData.find(c => c.id.toString() === params.challengeId)
        if (challenge) {
          setSelectedChallenge(challenge)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load squad builder data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    )
  }

  const handleSubmitSquad = async () => {
    if (!selectedChallenge || selectedCards.length === 0) {
      toast({
        title: "Error",
        description: "Please select a challenge and cards",
        variant: "destructive",
      })
      return
    }

    // Frontend Validation
    if (selectedCards.length !== selectedChallenge.requirements_total_cards) {
      toast({
        title: "Invalid Squad",
        description: `You need exactly ${selectedChallenge.requirements_total_cards} cards, but selected ${selectedCards.length}`,
        variant: "destructive",
      })
      return
    }

    // Check team rating if required
    if (selectedChallenge.requirements_team_rating) {
      const totalRating = selectedCards.reduce((sum, cardId) => {
        const userCard = userCards.find(uc => uc.id === cardId)
        return sum + (userCard?.cards.overall_rating || 0)
      }, 0)
      const averageRating = totalRating / selectedCards.length
      
      if (averageRating < selectedChallenge.requirements_team_rating) {
        toast({
          title: "Team Rating Too Low",
          description: `Average rating: ${averageRating.toFixed(1)}, Required: ${selectedChallenge.requirements_team_rating}`,
          variant: "destructive",
        })
        return
      }
    }

    // Check specific rarities if required
    if (selectedChallenge.requirements_specific_rarities) {
      const selectedCardRarities = selectedCards.map(cardId => {
        const userCard = userCards.find(uc => uc.id === cardId)
        return userCard?.cards.rarity
      }).filter(Boolean)
      
      for (const requiredRarity of selectedChallenge.requirements_specific_rarities) {
        if (!selectedCardRarities.includes(requiredRarity)) {
          toast({
            title: "Missing Required Rarity",
            description: `You need at least one ${requiredRarity} card`,
            variant: "destructive",
          })
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const result = await submitSBCSquad(
        user!.username,
        selectedChallenge.id,
        selectedCards
      )

      if (result.success) {
        // Show success message with rewards in English
        const rewards = result.validation?.rewardsGiven || {}
        let rewardText = "Squad submitted successfully!"
        
        if (rewards.tickets > 0 || rewards.elite_tickets > 0 || rewards.icon_tickets > 0 || rewards.tokens > 0) {
          rewardText += " Rewards received:"
          if (rewards.tickets > 0) rewardText += ` ${rewards.tickets} tickets`
          if (rewards.elite_tickets > 0) rewardText += ` ${rewards.elite_tickets} elite tickets`
          if (rewards.icon_tickets > 0) rewardText += ` ${rewards.icon_tickets} icon tickets`
          if (rewards.tokens > 0) rewardText += ` ${rewards.tokens} tokens`
        }

        toast({
          title: "🎉 Challenge Completed!",
          description: rewardText,
        })

        // Wait a moment for the toast to show, then redirect to SBC menu
        setTimeout(() => {
          router.push('/sbc')
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit squad",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting squad:", error)
      toast({
        title: "Error",
        description: "Failed to submit squad",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500'
      case 'rare': return 'bg-blue-500'
      case 'epic': return 'bg-purple-500'
      case 'legendary': return 'bg-yellow-500'
      case 'ultimate': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#232526] to-[#414345] p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading Squad Builder...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#232526] to-[#414345] p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/sbc">
            <Button variant="ghost" className="text-white hover:text-purple-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to SBC
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Squad Builder</h1>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Challenge Selection */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 border-purple-400 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  Select Challenge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {challenges.map((challenge) => (
                  <div
                    key={challenge.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedChallenge?.id === challenge.id
                        ? 'bg-purple-600/50 border-2 border-purple-400'
                        : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedChallenge(challenge)}
                  >
                    <h3 className="font-semibold text-purple-200">{challenge.name}</h3>
                    <p className="text-sm text-gray-300 mt-1">{challenge.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">{challenge.requirements_total_cards} cards</span>
                      {challenge.requirements_team_rating && (
                        <>
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm">{challenge.requirements_team_rating}+ rating</span>
                        </>
                      )}
                    </div>
                    {challenge.rewards_tickets && (
                      <div className="flex items-center gap-1 mt-2">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-yellow-200">
                          Reward: {challenge.rewards_tickets} tickets
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Card Selection */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 border-purple-400 text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Cards ({selectedCards.length} selected)</span>
                  {selectedChallenge && (
                    <Badge className="bg-purple-600">
                      {selectedCards.length}/{selectedChallenge.requirements_total_cards}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedChallenge ? (
                  <div className="text-center py-8 text-gray-300">
                    <Target className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                    <p>Please select a challenge first</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                                         {/* Requirements Display */}
                     <div className="bg-purple-900/30 p-4 rounded-lg">
                       <h4 className="font-semibold text-purple-200 mb-2">Requirements:</h4>
                       <div className="space-y-2 text-sm">
                         <div className="flex items-center justify-between">
                           <span className="truncate">Total Cards:</span>
                           <span className="ml-2 font-mono">{selectedCards.length}/{selectedChallenge.requirements_total_cards}</span>
                         </div>
                         {selectedChallenge.requirements_team_rating && (
                           <div className="flex items-center justify-between">
                             <span className="truncate">Team Rating:</span>
                             <span className="ml-2 font-mono">{selectedCards.length > 0 ? 'Calculating...' : '0'}/{selectedChallenge.requirements_team_rating}+</span>
                           </div>
                         )}
                         {selectedChallenge.requirements_min_level && (
                           <div className="flex items-center justify-between">
                             <span className="truncate">Min Level:</span>
                             <span className="ml-2 font-mono">{selectedChallenge.requirements_min_level}</span>
                           </div>
                         )}
                       </div>
                     </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                      {userCards.map((userCard) => (
                        <div
                          key={userCard.id}
                          className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                            selectedCards.includes(userCard.id)
                              ? 'ring-2 ring-purple-400 scale-105'
                              : 'hover:scale-105'
                          }`}
                          onClick={() => handleCardSelect(userCard.id)}
                        >
                          <img
                            src={userCard.cards.image_url || `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(userCard.cards.character || "anime")}%20character`}
                            alt={userCard.cards.name}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <div className="flex items-center justify-between">
                              <Badge className={`${getRarityColor(userCard.cards.rarity)} text-xs`}>
                                {userCard.cards.rarity}
                              </Badge>
                              <span className="text-white text-xs font-bold">
                                {userCard.cards.overall_rating}
                              </span>
                            </div>
                            <p className="text-white text-xs font-semibold truncate">
                              {userCard.cards.name}
                            </p>
                            <p className="text-gray-300 text-xs">
                              Level {userCard.cards.level} • {userCard.quantity}x
                            </p>
                          </div>
                          {selectedCards.includes(userCard.id) && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleSubmitSquad}
                        disabled={submitting || selectedCards.length === 0 || !selectedChallenge}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-lg font-semibold"
                      >
                        {submitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </div>
                        ) : (
                          <>
                            <Target className="h-4 w-4 mr-2" />
                            Exchange Squad
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 