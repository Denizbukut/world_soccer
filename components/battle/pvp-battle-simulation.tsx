"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Activity,
  Target,
  MessageCircle,
  Zap,
  Clock,
  Users,
  Award
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
// Remove the import since we'll use the API route instead

interface Card {
  id: string;
  name: string;
  overall_rating: number;
  rarity: string;
  level?: number;
  position?: string;
}

interface BattleSimulationProps {
  userCards: Card[];
  opponentCards: Card[];
  opponentUsername: string;
  onBattleEnd: (result: any) => void;
  onBack: () => void;
}

const randomMatchComments = [
  "🎯 Great save by the goalkeeper!",
  "💥 What a tackle! Defense holding strong!",
  "🔥 End to end action! This is football at its finest!",
  "🎯 Another fantastic save!",
  "💥 Yellow card shown!",
  "🔥 Substitution made!",
  "🎯 Incredible double save!",
  "⚡ Counter attack building up!",
  "🎯 Spectacular diving save!",
  "💥 Perfect interception!",
  "🔥 Beautiful passing play!",
  "🎯 Goalkeeper commands the area!",
  "💥 Strong defensive block!",
  "🔥 Midfield battle intensifies!",
  "🎯 Another brilliant stop!"
]

const possessionComments = [
  "Controlling possession well",
  "Looking to break quickly",
  "Building from the back",
  "Pressing high up the pitch",
  "Playing with confidence",
  "Struggling to keep the ball",
  "Dominating midfield",
  "Counter attacking style"
]

export default function PvpBattleSimulation({ 
  userCards, 
  opponentCards, 
  opponentUsername, 
  onBattleEnd, 
  onBack 
}: BattleSimulationProps) {
  const { user } = useAuth()
  const [currentMinute, setCurrentMinute] = useState(1)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [possession, setPossession] = useState({ home: 50, away: 50 })
  const [shots, setShots] = useState({ home: 0, away: 0 })
  const [shotsOnTarget, setShotsOnTarget] = useState({ home: 0, away: 0 })
  const [currentComment, setCurrentComment] = useState<string | { text: string; team: string }>("")
  const [commentIndex, setCommentIndex] = useState(0)
  const [matchEvents, setMatchEvents] = useState<(string | { text: string; team: string })[]>([])

  const [battleEnded, setBattleEnded] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)
  const [showBattleResult, setShowBattleResult] = useState(false)
  const [userTeamRating, setUserTeamRating] = useState(0)
  const [opponentTeamRating, setOpponentTeamRating] = useState(0)
  const [userStats, setUserStats] = useState<any>(null)
  const [opponentStats, setOpponentStats] = useState<any>(null)
  const [prestigePointsUpdated, setPrestigePointsUpdated] = useState(false)
  const [battleResultSaved, setBattleResultSaved] = useState(false)
  const battleResultSavedRef = useRef(false)
  
  // Reset the flag when component mounts
  useEffect(() => {
    battleResultSavedRef.current = false
    setBattleResultSaved(false)
    setPrestigePointsUpdated(false)
  }, [])
  
  // Reset flags when battle starts
  useEffect(() => {
    if (currentMinute === 1) {
      battleResultSavedRef.current = false
      setBattleResultSaved(false)
      setPrestigePointsUpdated(false)
    }
  }, [currentMinute])

  // Calculate level bonus based on rarity
  const getLevelBonus = (rarity: string, level: number = 1) => {
    const levelMultiplier = {
      'basic': 0.1,
      'rare': 0.15,
      'elite': 0.2,
      'ultimate': 0.35,
      'goat': 1.0
    };
    
    const multiplier = levelMultiplier[rarity.toLowerCase() as keyof typeof levelMultiplier] || 0.1;
    return (level - 1) * multiplier; // -1 because level 1 has no bonus
  };

  // Calculate team ratings with level bonuses and position-based stats
  useEffect(() => {
    const calculateTeamStats = (cards: Card[]) => {
      let totalRating = 0;
      let gkRating = 0;
      let dfRating = 0;
      let mfRating = 0;
      let stRating = 0;
      let gkCount = 0;
      let dfCount = 0;
      let mfCount = 0;
      let stCount = 0;

      cards.forEach(card => {
        const levelBonus = getLevelBonus(card.rarity, card.level);
        const adjustedRating = card.overall_rating + levelBonus;
        totalRating += adjustedRating;

        // Group by position for specialized calculations
        switch (card.position?.toLowerCase()) {
          case 'gk':
            gkRating += adjustedRating;
            gkCount++;
            break;
          case 'df':
            dfRating += adjustedRating;
            dfCount++;
            break;
          case 'mf':
            mfRating += adjustedRating;
            mfCount++;
            break;
          case 'st':
            stRating += adjustedRating;
            stCount++;
            break;
          default:
            // If no position specified, distribute evenly
            mfRating += adjustedRating;
            mfCount++;
        }
      });

      return {
        averageRating: totalRating / cards.length,
        gkRating: gkCount > 0 ? gkRating / gkCount : 70, // Default GK rating
        dfRating: dfCount > 0 ? dfRating / dfCount : 70, // Default DF rating
        mfRating: mfCount > 0 ? mfRating / mfCount : 70, // Default MF rating
        stRating: stCount > 0 ? stRating / stCount : 70, // Default ST rating
        gkCount,
        dfCount,
        mfCount,
        stCount
      };
    };

    const userStats = calculateTeamStats(userCards);
    const opponentStats = calculateTeamStats(opponentCards);
    
    setUserTeamRating(Math.round(userStats.averageRating * 10) / 10);
    setOpponentTeamRating(Math.round(opponentStats.averageRating * 10) / 10);

    // Store position-based stats for battle simulation
    setUserStats(userStats);
    setOpponentStats(opponentStats);
  }, [userCards, opponentCards]);

  // Main match simulation timer
  useEffect(() => {
    if (currentMinute >= 90 || battleEnded) return

    const interval = setInterval(() => {
      setCurrentMinute(prev => {
        const newMinute = prev + 1
        
        // Update possession based on midfield ratings - realistic but dynamic
        setPossession(prev => {
          // Calculate midfield advantage based on actual rating difference
          const userMfRating = userStats?.mfRating || 70;
          const opponentMfRating = opponentStats?.mfRating || 70;
          const mfDifference = userMfRating - opponentMfRating;
          
          // Calculate possession advantage based on midfield difference
          // Stronger midfield = more possession, but with realistic limits
          let mfAdvantage = 0;
          if (mfDifference > 10) {
            mfAdvantage = 0.8; // Strong advantage for much better midfield
          } else if (mfDifference > 5) {
            mfAdvantage = 0.5; // Moderate advantage for better midfield
          } else if (mfDifference > 2) {
            mfAdvantage = 0.3; // Small advantage for slightly better midfield
          } else if (mfDifference < -10) {
            mfAdvantage = -0.8; // Strong disadvantage for much worse midfield
          } else if (mfDifference < -5) {
            mfAdvantage = -0.5; // Moderate disadvantage for worse midfield
          } else if (mfDifference < -2) {
            mfAdvantage = -0.3; // Small disadvantage for slightly worse midfield
          }
          
          // Add some randomness to make it dynamic
          const randomChange = (Math.random() - 0.5) * 0.6;
          const totalChange = randomChange + mfAdvantage;
          
          // Realistic bounds (30-70 instead of 35-65)
          const newHome = Math.max(30, Math.min(70, prev.home + totalChange));
          return { home: Math.round(newHome), away: Math.round(100 - newHome) };
        });

        // Update shots based on RATING DIFFERENCE - not fixed probability!
        // Calculate shot probability based on team ratings
        const userShotProbability = 0.15; // Base 15% chance per minute
        const opponentShotProbability = 0.15; // Base 15% chance per minute
        
        // Adjust shot probability based on team strength
        const userTeamStrength = userStats?.stRating || 70;
        const opponentTeamStrength = opponentStats?.stRating || 70;
        
        // User shot probability based on team strength
        let adjustedUserShotChance = userShotProbability;
        if (userTeamStrength > 85) {
          adjustedUserShotChance = 0.25; // 25% chance if very strong
        } else if (userTeamStrength > 80) {
          adjustedUserShotChance = 0.22; // 22% chance if strong
        } else if (userTeamStrength > 75) {
          adjustedUserShotChance = 0.18; // 18% chance if good
        } else if (userTeamStrength > 70) {
          adjustedUserShotChance = 0.15; // 15% chance if average
        } else {
          adjustedUserShotChance = 0.10; // 10% chance if weak
        }
        
        // Opponent shot probability based on team strength
        let adjustedOpponentShotChance = opponentShotProbability;
        if (opponentTeamStrength > 85) {
          adjustedOpponentShotChance = 0.25; // 25% chance if very strong
        } else if (opponentTeamStrength > 80) {
          adjustedOpponentShotChance = 0.22; // 22% chance if strong
        } else if (opponentTeamStrength > 75) {
          adjustedOpponentShotChance = 0.18; // 18% chance if good
        } else if (opponentTeamStrength > 70) {
          adjustedOpponentShotChance = 0.15; // 15% chance if average
        } else {
          adjustedOpponentShotChance = 0.10; // 10% chance if weak
        }
        
        // Check for shots based on rating-adjusted probability
        if (Math.random() < adjustedUserShotChance) {
          setShots(prev => ({
            ...prev,
            home: prev.home + 1
          }));
        }
        
        if (Math.random() < adjustedOpponentShotChance) {
          setShots(prev => ({
            ...prev,
            away: prev.away + 1
          }));
        }

        // Update shots on target based on RATING DIFFERENCE - not fixed probability!
        // Calculate shot accuracy based on team ratings
        const userAccuracyProbability = 0.12; // Base 12% chance per minute
        const opponentAccuracyProbability = 0.12; // Base 12% chance per minute
        
        // Adjust accuracy probability based on team strength
        const userAccuracy = userStats?.stRating || 70;
        const opponentAccuracy = opponentStats?.stRating || 70;
        
        // User accuracy probability based on team strength
        let adjustedUserAccuracyChance = userAccuracyProbability;
        if (userAccuracy > 85) {
          adjustedUserAccuracyChance = 0.20; // 20% chance if very strong
        } else if (userAccuracy > 80) {
          adjustedUserAccuracyChance = 0.18; // 18% chance if strong
        } else if (userAccuracy > 75) {
          adjustedUserAccuracyChance = 0.15; // 15% chance if good
        } else if (userAccuracy > 70) {
          adjustedUserAccuracyChance = 0.12; // 12% chance if average
        } else {
          adjustedUserAccuracyChance = 0.08; // 8% chance if weak
        }
        
        // Opponent accuracy probability based on team strength
        let adjustedOpponentAccuracyChance = opponentAccuracyProbability;
        if (opponentAccuracy > 85) {
          adjustedOpponentAccuracyChance = 0.20; // 20% chance if very strong
        } else if (opponentAccuracy > 80) {
          adjustedOpponentAccuracyChance = 0.18; // 18% chance if strong
        } else if (opponentAccuracy > 75) {
          adjustedOpponentAccuracyChance = 0.15; // 15% chance if good
        } else if (opponentAccuracy > 70) {
          adjustedOpponentAccuracyChance = 0.12; // 12% chance if average
        } else {
          adjustedOpponentAccuracyChance = 0.08; // 8% chance if weak
        }
        
        // Check for shots on target based on rating-adjusted probability
        if (Math.random() < adjustedUserAccuracyChance) {
          setShotsOnTarget(prev => ({
            ...prev,
            home: prev.home + 1
          }));
        }
        
        if (Math.random() < adjustedOpponentAccuracyChance) {
          setShotsOnTarget(prev => ({
            ...prev,
            away: prev.away + 1
          }));
        }

        // Generate goals based on OVERALL TEAM RATING DIFFERENCE - MUCH STRONGER!
        // Calculate overall team rating difference (this is the key!)
        const userOverallRating = userStats?.averageRating || 70;
        const opponentOverallRating = opponentStats?.averageRating || 70;
        const overallRatingDifference = userOverallRating - opponentOverallRating;
        
        // MUCH STRONGER goal probability based on overall rating difference
        let userGoalProbability = 0.01; // Very low base chance
        let opponentGoalProbability = 0.01; // Very low base chance
        
        // User goal probability based on OVERALL rating advantage - MUCH MORE CONSERVATIVE
        if (overallRatingDifference > 10) {
          userGoalProbability = 0.03; // 3% chance per minute if much stronger (was 8%)
        } else if (overallRatingDifference > 7) {
          userGoalProbability = 0.025; // 2.5% chance per minute if stronger (was 6%)
        } else if (overallRatingDifference > 5) {
          userGoalProbability = 0.02; // 2% chance per minute if somewhat stronger (was 5%)
        } else if (overallRatingDifference > 3) {
          userGoalProbability = 0.015; // 1.5% chance per minute if slightly stronger (was 4%)
        } else if (overallRatingDifference > 1) {
          userGoalProbability = 0.01; // 1% chance per minute if barely stronger (was 3%)
        } else if (overallRatingDifference > -3) {
          userGoalProbability = 0.008; // 0.8% chance per minute if weaker (was 2%)
        } else {
          userGoalProbability = 0.005; // 0.5% chance per minute if much weaker (was 1%)
        }
        
        // Opponent goal probability based on OVERALL rating advantage - MUCH MORE CONSERVATIVE
        if (overallRatingDifference < -10) {
          opponentGoalProbability = 0.03; // 3% chance per minute if much stronger (was 8%)
        } else if (overallRatingDifference < -7) {
          opponentGoalProbability = 0.025; // 2.5% chance per minute if stronger (was 6%)
        } else if (overallRatingDifference < -5) {
          opponentGoalProbability = 0.02; // 2% chance per minute if somewhat stronger (was 5%)
        } else if (overallRatingDifference < -3) {
          opponentGoalProbability = 0.015; // 1.5% chance per minute if slightly stronger (was 4%)
        } else if (overallRatingDifference < -1) {
          opponentGoalProbability = 0.01; // 1% chance per minute if barely stronger (was 3%)
        } else if (overallRatingDifference < 3) {
          opponentGoalProbability = 0.008; // 0.8% chance per minute if weaker (was 2%)
        } else {
          opponentGoalProbability = 0.005; // 0.5% chance per minute if much weaker (was 1%)
        }
      
        // Check for goals based on rating-based probability
        if (Math.random() < userGoalProbability) {
          setHomeScore(prev => prev + 1);
          const strikerCard = userCards.find(card => card.position?.toLowerCase() === 'st') || userCards[Math.floor(Math.random() * userCards.length)];
          setMatchEvents(prev => [...prev, { text: `⚽ GOAL! ${strikerCard?.name || 'Player'} scores!`, team: 'home' }]);
        }
        
        if (Math.random() < opponentGoalProbability) {
          setAwayScore(prev => prev + 1);
          const strikerCard = opponentCards.find(card => card.position?.toLowerCase() === 'st') || opponentCards[Math.floor(Math.random() * userCards.length)];
          setMatchEvents(prev => [...prev, { text: `⚽ GOAL! ${strikerCard?.name || 'Player'} scores!`, team: 'away' }]);
        }

        // Add random match comments to live commentary
        if (Math.random() < 0.1) {
          const randomComment = randomMatchComments[Math.floor(Math.random() * randomMatchComments.length)]
          // Determine which team the comment is about based on possession
          const team = possession.home > possession.away ? 'home' : possession.away > possession.home ? 'away' : Math.random() > 0.5 ? 'home' : 'away'
          setCurrentComment({ text: randomComment, team })
        }

        // End match at 90 minutes
        if (newMinute >= 90) {
          setBattleEnded(true)
          
          // Save battle result immediately (only if not already saved)
          ;(async () => {
            if (user?.username && !battleResultSavedRef.current) {
              try {
                const selectedMode = JSON.parse(localStorage.getItem('selected_battle_mode') || '{"id": 1, "name": "PvP Battle"}')
                const result = (homeScore > awayScore ? 'win' : awayScore > homeScore ? 'loss' : 'draw') as 'win' | 'loss' | 'draw'
                console.log('🔍 Battle result calculation:', { homeScore, awayScore, result })
                
                const battleData = {
                  userId: user.username,
                  opponentId: opponentUsername,
                  userCards: userCards,
                  opponentCards: opponentCards,
                  result: result,
                  homeScore,
                  awayScore,
                  possession,
                  shots,
                  shotsOnTarget,
                  battleModeId: selectedMode.id
                }
                
                // Use the API route instead of server action
                const response = await fetch('/api/save-pvp-result', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(battleData)
                })
                
                if (response.ok) {
                  console.log('PvP battle result saved to database (including prestige points)')
                  battleResultSavedRef.current = true
                  setBattleResultSaved(true)
                  
                  // Mark prestige points as updated for UI immediately
                  if (homeScore !== awayScore) {
                    setPrestigePointsUpdated(true)
                  }
                } else {
                  console.error('Error saving PvP battle result:', await response.text())
                }
              } catch (error) {
                console.error('Error saving PvP battle result:', error)
              }
            }
          })()
          
          // Show loading screen for 2 seconds, then show result
          setTimeout(() => {
            setShowBattleResult(true)
          }, 2000)
          
          // Call onBattleEnd to return to battle arena after a delay
          setTimeout(() => {
            onBattleEnd({
              winner: homeScore > awayScore ? 'user' : awayScore > homeScore ? 'opponent' : 'draw',
              score: `${homeScore} - ${awayScore}`,
              homeScore,
              awayScore,
              possession,
              shots,
              shotsOnTarget
            })
          }, 3000)
        }

        return newMinute
      })
    }, 1000) // 1 second per minute

    return () => clearInterval(interval)
  }, [currentMinute, battleEnded, userTeamRating, opponentTeamRating, userCards, opponentCards, homeScore, awayScore, possession, shots, shotsOnTarget, onBattleEnd, userStats, opponentStats])

  // Rotating commentary
  useEffect(() => {
    if (battleEnded) return

    const interval = setInterval(() => {
      setCommentIndex(prev => {
        const newIndex = (prev + 1) % possessionComments.length
        // Determine which team the possession comment is about
        const team = possession.home > possession.away ? 'home' : possession.away > possession.home ? 'away' : Math.random() > 0.5 ? 'home' : 'away'
        setCurrentComment({ text: possessionComments[newIndex], team })
        return newIndex
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [battleEnded])

  const formatMinute = (minute: number) => {
    if (minute <= 45) return `${minute}'`
    if (minute <= 90) return `${minute}'`
    return "90'"
  }

  const getMatchStatus = () => {
    if (currentMinute <= 45) return "First Half"
    if (currentMinute <= 90) return "Second Half"
    return "Full Time"
  }

     // Function to quickly simulate the rest of the match
   const simulateRemainingMatch = async () => {
     setIsSkipping(true)
     
     // Track scores locally since React state updates are async
     let finalHomeScore = homeScore;
     let finalAwayScore = awayScore;
     
     // Simulate remaining minutes quickly
     for (let minute = currentMinute; minute <= 90; minute++) {
       setCurrentMinute(minute)
       
               // Update possession - realistic but dynamic
        setPossession(prev => {
          // Calculate midfield advantage based on actual rating difference
          const userMfRating = userStats?.mfRating || 70;
          const opponentMfRating = opponentStats?.mfRating || 70;
          const mfDifference = userMfRating - opponentMfRating;
          
          // Calculate possession advantage based on midfield difference
          // Stronger midfield = more possession, but with realistic limits
          let mfAdvantage = 0;
          if (mfDifference > 10) {
            mfAdvantage = 0.8; // Strong advantage for much better midfield
          } else if (mfDifference > 5) {
            mfAdvantage = 0.5; // Moderate advantage for better midfield
          } else if (mfDifference > 2) {
            mfAdvantage = 0.3; // Small advantage for slightly better midfield
          } else if (mfDifference < -10) {
            mfAdvantage = -0.8; // Strong disadvantage for much worse midfield
          } else if (mfDifference < -5) {
            mfAdvantage = -0.5; // Moderate disadvantage for worse midfield
          } else if (mfDifference < -2) {
            mfAdvantage = -0.3; // Small disadvantage for slightly worse midfield
          }
          
          // Add some randomness to make it dynamic
          const randomChange = (Math.random() - 0.5) * 0.6;
          const totalChange = randomChange + mfAdvantage;
          
          // Realistic bounds (30-70 instead of 35-65)
          const newHome = Math.max(30, Math.min(70, prev.home + totalChange));
          return { home: Math.round(newHome), away: Math.round(100 - newHome) };
        });

       // Update shots
       const userShotProbability = 0.15;
       const opponentShotProbability = 0.15;
       
       const userTeamStrength = userStats?.stRating || 70;
       const opponentTeamStrength = opponentStats?.stRating || 70;
       
       let adjustedUserShotChance = userShotProbability;
       if (userTeamStrength > 85) adjustedUserShotChance = 0.25;
       else if (userTeamStrength > 80) adjustedUserShotChance = 0.22;
       else if (userTeamStrength > 75) adjustedUserShotChance = 0.18;
       else if (userTeamStrength > 70) adjustedUserShotChance = 0.15;
       else adjustedUserShotChance = 0.10;
       
       let adjustedOpponentShotChance = opponentShotProbability;
       if (opponentTeamStrength > 85) adjustedOpponentShotChance = 0.25;
       else if (opponentTeamStrength > 80) adjustedOpponentShotChance = 0.22;
       else if (opponentTeamStrength > 75) adjustedOpponentShotChance = 0.18;
       else if (opponentTeamStrength > 70) adjustedOpponentShotChance = 0.15;
       else adjustedOpponentShotChance = 0.10;
       
       if (Math.random() < adjustedUserShotChance) {
         setShots(prev => ({ ...prev, home: prev.home + 1 }));
       }
       
       if (Math.random() < adjustedOpponentShotChance) {
         setShots(prev => ({ ...prev, away: prev.away + 1 }));
       }

       // Update shots on target
       const userAccuracyProbability = 0.12;
       const opponentAccuracyProbability = 0.12;
       
       const userAccuracy = userStats?.stRating || 70;
       const opponentAccuracy = opponentStats?.stRating || 70;
       
       let adjustedUserAccuracyChance = userAccuracyProbability;
       if (userAccuracy > 85) adjustedUserAccuracyChance = 0.20;
       else if (userAccuracy > 80) adjustedUserAccuracyChance = 0.18;
       else if (userAccuracy > 75) adjustedUserAccuracyChance = 0.15;
       else if (userAccuracy > 70) adjustedUserAccuracyChance = 0.12;
       else adjustedUserAccuracyChance = 0.08;
       
       let adjustedOpponentAccuracyChance = opponentAccuracyProbability;
       if (opponentAccuracy > 85) adjustedOpponentAccuracyChance = 0.20;
       else if (opponentAccuracy > 80) adjustedOpponentAccuracyChance = 0.18;
       else if (opponentAccuracy > 75) adjustedOpponentAccuracyChance = 0.15;
       else if (opponentAccuracy > 70) adjustedOpponentAccuracyChance = 0.12;
       else adjustedOpponentAccuracyChance = 0.08;
       
       if (Math.random() < adjustedUserAccuracyChance) {
         setShotsOnTarget(prev => ({ ...prev, home: prev.home + 1 }));
       }
       
       if (Math.random() < adjustedOpponentAccuracyChance) {
         setShotsOnTarget(prev => ({ ...prev, away: prev.away + 1 }));
       }

       // Generate goals
       const userOverallRating = userStats?.averageRating || 70;
       const opponentOverallRating = opponentStats?.averageRating || 70;
       const overallRatingDifference = userOverallRating - opponentOverallRating;
       
       let userGoalProbability = 0.01;
       let opponentGoalProbability = 0.01;
       
       if (overallRatingDifference > 10) userGoalProbability = 0.03;
       else if (overallRatingDifference > 7) userGoalProbability = 0.025;
       else if (overallRatingDifference > 5) userGoalProbability = 0.02;
       else if (overallRatingDifference > 3) userGoalProbability = 0.015;
       else if (overallRatingDifference > 1) userGoalProbability = 0.01;
       else if (overallRatingDifference > -3) userGoalProbability = 0.008;
       else userGoalProbability = 0.005;
       
       if (overallRatingDifference < -10) opponentGoalProbability = 0.03;
       else if (overallRatingDifference < -7) opponentGoalProbability = 0.025;
       else if (overallRatingDifference < -5) opponentGoalProbability = 0.02;
       else if (overallRatingDifference < -3) opponentGoalProbability = 0.015;
       else if (overallRatingDifference < -1) opponentGoalProbability = 0.01;
       else if (overallRatingDifference < 3) opponentGoalProbability = 0.008;
       else opponentGoalProbability = 0.005;
       
       if (Math.random() < userGoalProbability) {
         finalHomeScore++;
         setHomeScore(finalHomeScore);
         const strikerCard = userCards.find(card => card.position?.toLowerCase() === 'st') || userCards[Math.floor(Math.random() * userCards.length)];
         setMatchEvents(prev => [...prev, { text: `⚽ GOAL! ${strikerCard?.name || 'Player'} scores!`, team: 'home' }]);
       }
       
       if (Math.random() < opponentGoalProbability) {
         finalAwayScore++;
         setAwayScore(finalAwayScore);
         const strikerCard = opponentCards.find(card => card.position?.toLowerCase() === 'st') || opponentCards[Math.floor(Math.random() * userCards.length)];
         setMatchEvents(prev => [...prev, { text: `⚽ GOAL! ${strikerCard?.name || 'Player'} scores!`, team: 'away' }]);
       }

       // Add random comments
       if (Math.random() < 0.1) {
         const randomComment = randomMatchComments[Math.floor(Math.random() * randomMatchComments.length)]
         // Determine which team the comment is about based on possession
         const team = possession.home > possession.away ? 'home' : possession.away > possession.home ? 'away' : Math.random() > 0.5 ? 'home' : 'away'
         setCurrentComment({ text: randomComment, team })
       }

       // Small delay to make it visible
       await new Promise(resolve => setTimeout(resolve, 50))
     }
     
     // End the match
     setBattleEnded(true)
     setIsSkipping(false)
    
         // Save battle result immediately (only if not already saved)
     ;(async () => {
       if (user?.username && !battleResultSavedRef.current) {
         try {
           const selectedMode = JSON.parse(localStorage.getItem('selected_battle_mode') || '{"id": 1, "name": "PvP Battle"}')
           const result = (finalHomeScore > finalAwayScore ? 'win' : finalAwayScore > finalHomeScore ? 'loss' : 'draw') as 'win' | 'loss' | 'draw'
           console.log('🔍 SKIP Battle result calculation:', { finalHomeScore, finalAwayScore, result })
           
           const battleData = {
             userId: user.username,
             opponentId: opponentUsername,
             userCards: userCards,
             opponentCards: opponentCards,
             result: result,
             homeScore: finalHomeScore,
             awayScore: finalAwayScore,
             possession,
             shots,
             shotsOnTarget,
             battleModeId: selectedMode.id
           }
          
          // Use the API route instead of server action
          const response = await fetch('/api/save-pvp-result', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(battleData)
          })
          
          if (response.ok) {
            console.log('PvP battle result saved to database (including prestige points)')
            battleResultSavedRef.current = true
            setBattleResultSaved(true)
            
            // Mark prestige points as updated for UI immediately
            if (homeScore !== awayScore) {
              setPrestigePointsUpdated(true)
            }
          } else {
            console.error('Error saving PvP battle result:', await response.text())
          }
        } catch (error) {
          console.error('Error saving PvP battle result:', error)
        }
      }
    })()
    
    // Show loading screen for 2 seconds, then show result
    setTimeout(() => {
      setShowBattleResult(true)
    }, 2000)
    
    // Call onBattleEnd to return to battle arena after a delay
    setTimeout(() => {
      onBattleEnd({
        winner: finalHomeScore > finalAwayScore ? 'user' : finalAwayScore > finalHomeScore ? 'opponent' : 'draw',
        score: `${finalHomeScore} - ${finalAwayScore}`,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        possession,
        shots,
        shotsOnTarget
      })
    }, 3000)
  }

     return (
     <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black" style={{ paddingBottom: '0' }}>
      {/* Header */}
      <header className="bg-orange-600 text-white p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
                         <Button
               onClick={onBack}
               variant="ghost"
               size="sm"
               className="text-white hover:bg-white/20 p-2"
               disabled={battleEnded ? false : true}
             >
               <ArrowLeft className={`w-5 h-5 ${battleEnded ? '' : 'opacity-50'}`} />
             </Button>
            <h1 className="text-2xl font-bold">Live Battle</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white">
              {getMatchStatus()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        {/* Match Display */}
        <Card className="mb-4 bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
          <CardContent className="p-4">
            {/* Teams and Score */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-300 font-medium">You</div>
                  <div className="text-2xl font-bold text-yellow-400">{homeScore}</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-white mb-1">{formatMinute(currentMinute)}</div>
                <div className="text-xs text-gray-400">Live</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-sm text-gray-300 font-medium truncate max-w-20">{opponentUsername}</div>
                  <div className="text-2xl font-bold text-yellow-400">{awayScore}</div>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center border-2 border-gray-300">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Match Image */}
            <div className="relative mb-4">
              <div className="w-full h-40 bg-gradient-to-br from-orange-600 to-black rounded-lg flex items-center justify-center overflow-hidden">
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">⚽</div>
                  <div className="text-lg font-bold">Live Match</div>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                  LIVE
                </Badge>
              </div>
            </div>

            {/* Live Comment */}
            <motion.div
              key={commentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 p-3 bg-gradient-to-r from-orange-900/40 to-black/60 rounded-lg border border-orange-500/30"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-orange-400" />
                <span className={`text-sm font-medium ${
                  isSkipping 
                    ? "text-white" 
                    : typeof currentComment === 'string' 
                      ? "text-white" 
                      : currentComment.team === 'home' 
                        ? "text-blue-400" 
                        : "text-red-400"
                }`}>
                  {isSkipping ? "Simulating remaining match..." : typeof currentComment === 'string' ? currentComment : currentComment.text}
                </span>
              </div>
            </motion.div>

            {/* Match Events */}
            <AnimatePresence>
              {matchEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-3 bg-gradient-to-r from-blue-900/40 to-black/60 rounded-lg border border-blue-500/30 max-h-32 overflow-y-auto"
                >
                  <div className="text-xs text-blue-400 font-bold mb-2">Match Events:</div>
                  <div className="space-y-1">
                    {matchEvents.slice(-5).map((event, index) => (
                      <div key={index} className={`text-xs ${
                        typeof event === 'string' 
                          ? 'text-white' 
                          : event.team === 'home' 
                            ? 'text-blue-400' 
                            : 'text-red-400'
                      }`}>
                        {typeof event === 'string' ? event : event.text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Possession */}
          <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Possession</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">{possession.home}%</div>
                    <div className="text-xs text-gray-300">You</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{possession.away}%</div>
                    <div className="text-xs text-gray-300 truncate max-w-16">{opponentUsername}</div>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-1000"
                    style={{ width: `${possession.home}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shots */}
          <Card className="bg-gradient-to-br from-orange-900/40 to-black/60 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Shots</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">Total</span>
                  <div className="flex gap-4">
                    <span className="text-sm text-orange-400 font-bold">{shots.home}</span>
                    <span className="text-sm text-red-400 font-bold">{shots.away}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">On Target</span>
                  <div className="flex gap-4">
                    <span className="text-sm text-orange-400 font-bold">{shotsOnTarget.home}</span>
                    <span className="text-sm text-red-400 font-bold">{shotsOnTarget.away}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Ratings */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-green-400" />
                <h3 className="text-sm font-bold text-white">Your Team</h3>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{userTeamRating}</div>
                <div className="text-xs text-gray-300">Average Rating</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/40 to-black/60 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-red-400 flex-shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">{opponentUsername}</h3>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{opponentTeamRating}</div>
                <div className="text-xs text-gray-300">Average Rating</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="text-center">
          <Button
            onClick={simulateRemainingMatch}
            disabled={isSkipping || battleEnded}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            {isSkipping ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Simulating...
              </div>
            ) : battleEnded ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading Result...
              </div>
            ) : (
              "Skip to Result"
            )}
          </Button>
        </div>

        {/* Loading Screen when Battle Ends */}
        <AnimatePresence>
          {battleEnded && !showBattleResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            >
              <Card className="bg-gradient-to-br from-blue-900/40 to-black/60 border-blue-500/30 max-w-lg mx-4">
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold text-white mb-2">Processing Battle Result</h2>
                  <p className="text-sm text-gray-300">Please wait while we calculate the final score...</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battle End Screen */}
        <AnimatePresence>
          {showBattleResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            >
              <Card className="bg-gradient-to-br from-yellow-900/40 to-black/60 border-yellow-500/30 max-w-lg mx-4">
                <CardContent className="p-6 text-center">
                  <h2 className="text-2xl font-bold text-white mb-4">Match Complete!</h2>
                  <div className="text-3xl font-bold text-white mb-2">{homeScore} - {awayScore}</div>
                  <div className="text-lg text-yellow-400 font-semibold mb-4">
                    {homeScore > awayScore ? "You Win!" : awayScore > homeScore ? <span className="truncate">{opponentUsername} Wins!</span> : "It's a Draw!"}
                  </div>
                  
                  {/* Prestige Points Update */}
                  {homeScore !== awayScore && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-green-900/40 to-black/60 rounded-lg border border-green-500/30">
                      <div className="text-sm text-green-400 font-bold mb-2">
                        {prestigePointsUpdated ? "✅ Prestige Points Updated!" : "⏳ Updating Prestige Points..."}
                      </div>
                      <div className="text-xs text-white">
                                                 {homeScore > awayScore ? (
                           <>
                             <div className={prestigePointsUpdated ? "text-green-400" : "text-gray-400"}>
                               You gained +20 prestige points
                             </div>
                             <div className={`truncate ${prestigePointsUpdated ? "text-red-400" : "text-gray-400"}`}>
                               {opponentUsername} lost -10 prestige points
                             </div>
                           </>
                         ) : (
                           <>
                             <div className={`truncate ${prestigePointsUpdated ? "text-green-400" : "text-gray-400"}`}>
                               {opponentUsername} gained +20 prestige points
                             </div>
                             <div className={prestigePointsUpdated ? "text-red-400" : "text-gray-400"}>
                               You lost -10 prestige points
                             </div>
                           </>
                         )}
                      </div>
                      {!prestigePointsUpdated && (
                        <div className="mt-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400 mx-auto"></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
