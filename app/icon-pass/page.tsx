'use client'
import { useState, useEffect } from "react";
import { Crown, Clock, Home, Ticket, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useAuth } from "@/contexts/auth-context";

interface LevelReward {
  level: number
  iconClaimed: boolean
  isSpecialLevel?: boolean
}

export default function IconPassPage() {
  const { user, updateUserTickets, refreshUserData } = useAuth();
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedToday, setClaimedToday] = useState(() => {
    if (typeof window !== 'undefined') {
      const lastClaim = localStorage.getItem('icon_ticket_last_claim');
      if (lastClaim) {
        const last = new Date(lastClaim);
        const now = new Date();
        const diff = now.getTime() - last.getTime();
        return diff < 24 * 60 * 60 * 1000; // 24 hours
      }
    }
    return false;
  });
  const [claimingClassic, setClaimingClassic] = useState(false);
  const [claimingElite, setClaimingElite] = useState(false);
  const [claimingIcon, setClaimingIcon] = useState(false);
  const [nextClaimTime, setNextClaimTime] = useState<string>('');
  const [hasIconPass, setHasIconPass] = useState(false);
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([]);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);

  // Check if user has active Icon Pass
  useEffect(() => {
    const checkIconPass = async () => {
      if (!user?.username) return
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('icon_passes')
          .select('*')
          .eq('user_id', user.username)
          .eq('active', true)
          .single()

        console.log('Icon Pass check in icon-pass page:', { data, error, username: user.username })
        
        if (!error && data) {
          setHasIconPass(true)
          setSuccess(true) // Set success to true if pass is already active
          console.log('✅ Icon Pass is already active!')
        } else {
          setHasIconPass(false)
          console.log('❌ No active Icon Pass found')
        }
      } catch (error) {
        console.error('❌ Error checking Icon Pass:', error)
        setHasIconPass(false)
      }
    }

    checkIconPass()
  }, [user?.username]);

  // Check claimed status on page load
  useEffect(() => {
    const checkClaimedStatus = () => {
      const lastClaim = localStorage.getItem('icon_ticket_last_claim');
      if (lastClaim) {
        const last = new Date(lastClaim);
        const now = new Date();
        const diff = now.getTime() - last.getTime();
        const isClaimed = diff < 24 * 60 * 60 * 1000; // 24 hours
        setClaimedToday(isClaimed);
        console.log('Claimed status check:', { lastClaim, isClaimed, diff });
      }
    };

    checkClaimedStatus();
  }, []);

  // Fetch claimed rewards and generate level rewards
  useEffect(() => {
    const fetchClaimedLevels = async () => {
      if (!user?.username) return;

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch claimed rewards from database
        const { data: claimedRewardsData, error: claimedRewardsError } = await supabase
          .from("claimed_rewards")
          .select("*")
          .eq("user_id", user.username);

        if (claimedRewardsError) {
          console.error("Error fetching claimed rewards:", claimedRewardsError);
          return;
        }

        // Create rewards array for all levels up to current level + 50 (to show future levels)
        const userLevel = user.level || 1;
        const maxLevel = Math.max(userLevel + 50, 50); // Show at least up to level 50
        const rewards: LevelReward[] = [];

        for (let i = 1; i <= maxLevel; i++) {
          const claimedReward = claimedRewardsData?.find((reward) => reward.level === i);

          // Double rewards for every 5 levels
          const isSpecialLevel = i % 5 === 0;

          rewards.push({
            level: i,
            iconClaimed: Boolean(claimedReward?.icon_claimed),
            isSpecialLevel: isSpecialLevel,
          });
        }

        setLevelRewards(rewards);

        // Calculate unclaimed rewards
        let unclaimed = 0;
        rewards.forEach((reward) => {
          if (reward.level <= userLevel) {
            if (!reward.iconClaimed) unclaimed++;
          }
        });
        setUnclaimedRewards(unclaimed);
      } catch (error) {
        console.error("Error in fetchClaimedLevels:", error);
      }
    };

    fetchClaimedLevels();
  }, [user?.username, user?.level]);

  // Calculate next claim time
  const calculateNextClaimTime = () => {
    const lastClaim = localStorage.getItem('icon_ticket_last_claim');
    if (!lastClaim) return '';
    
    const last = new Date(lastClaim);
    const next = new Date(last.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const now = new Date();
    
    if (next <= now) return '';
    
    const diff = next.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Update next claim time every minute
  useEffect(() => {
    const updateTime = () => {
      const time = calculateNextClaimTime();
      setNextClaimTime(time);
      console.log('Next claim time:', time, 'Claimed today:', claimedToday);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [claimedToday]);

  const handleBuy = async () => {
    if (!user) return;
    
    setBuying(true);
    
    try {
      // Payment durchführen
      const res = await fetch("/api/initiate-payment", {
        method: "POST",
      });
      const { id } = await res.json();

      const payload = {
        reference: id,
        to: "0xf41442bf1d3e7c629678cbd9e50ea263a6befdc3",
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(1.5, Tokens.WLD).toString(),
          },
        ],
        description: "Buy Icon Pass",
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

      if (finalPayload.status === "success") {
        console.log("success sending icon pass payment");
        
        // Icon Pass in Datenbank speichern
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error: insertError } = await supabase
          .from('icon_passes')
          .insert({
            user_id: user.username,
            active: true,
            purchased_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          });

        if (insertError) {
          console.error('Error saving icon pass:', insertError);
          toast({ 
            title: 'Error', 
            description: 'Payment successful but failed to activate pass. Please contact support.', 
            variant: 'destructive' 
          });
        } else {
          setSuccess(true);
          setHasIconPass(true);
          toast({ 
            title: 'Success!', 
            description: 'Icon Pass purchased and activated successfully!' 
          });
        }
      } else {
        toast({ 
          title: 'Error', 
          description: 'Payment failed. Please try again.', 
          variant: 'destructive' 
        });
      }
    } catch (e) {
      console.error('Payment error:', e);
      toast({ 
        title: 'Error', 
        description: 'Payment failed. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setBuying(false);
    }
  };

  const handleClaim = async () => {
    if (!user) return;
    
    setClaiming(true);
    
    try {
      const newIconTickets = (user.icon_tickets || 0) + 1;
      await updateUserTickets(user.tickets, user.elite_tickets, newIconTickets);
      await refreshUserData?.();
      
      // Save claim time to localStorage
      localStorage.setItem('icon_ticket_last_claim', new Date().toISOString());
      setClaimedToday(true);
      
      toast({ 
        title: 'Claimed!', 
        description: 'You have claimed your daily icon ticket.' 
      });
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to claim icon ticket.', 
        variant: 'destructive' 
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimClassic = async () => {
    if (!user) return;
    
    setClaimingClassic(true);
    
    try {
      const newTickets = (user.tickets || 0) + 1;
      await updateUserTickets(newTickets, user.elite_tickets, user.icon_tickets);
      await refreshUserData?.();
      
      toast({ 
        title: 'Claimed!', 
        description: 'You have claimed 1 classic ticket.' 
      });
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to claim classic ticket.', 
        variant: 'destructive' 
      });
    } finally {
      setClaimingClassic(false);
    }
  };

  const handleClaimElite = async () => {
    if (!user) return;
    
    setClaimingElite(true);
    
    try {
      const newEliteTickets = (user.elite_tickets || 0) + 1;
      await updateUserTickets(user.tickets, newEliteTickets, user.icon_tickets);
      await refreshUserData?.();
      
      toast({ 
        title: 'Claimed!', 
        description: 'You have claimed 1 elite ticket.' 
      });
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to claim elite ticket.', 
        variant: 'destructive' 
      });
    } finally {
      setClaimingElite(false);
    }
  };

  const handleClaimIcon = async () => {
    if (!user) return;
    
    setClaimingIcon(true);
    
    try {
      const newIconTickets = (user.icon_tickets || 0) + 1;
      await updateUserTickets(user.tickets, user.elite_tickets, newIconTickets);
      await refreshUserData?.();
      
      // Save claim time to localStorage
      localStorage.setItem('icon_ticket_last_claim', new Date().toISOString());
      setClaimedToday(true);
      
      toast({ 
        title: 'Claimed!', 
        description: 'You have claimed your daily icon ticket.' 
      });
    } catch (e) {
      toast({ 
        title: 'Error', 
        description: 'Failed to claim icon ticket.', 
        variant: 'destructive' 
      });
    } finally {
      setClaimingIcon(false);
    }
  };

  const handleClaimAllRewards = async () => {
    if (!user?.username) return;

    setIsClaimingReward(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      if (!supabase) return;

      let iconTicketsToAdd = 0;
      const updatedRewards = [...levelRewards];
      const userLevel = user.level || 1;

      // Process all unclaimed rewards up to the user's current level
      for (let i = 0; i < updatedRewards.length; i++) {
        const reward = updatedRewards[i];
        if (reward.level <= userLevel) {
          // Icon rewards
          if (!reward.iconClaimed) {
            // Double rewards for every 5 levels
            iconTicketsToAdd += reward.isSpecialLevel ? 5 : 1;
            updatedRewards[i] = { ...reward, iconClaimed: true };
          }
        }
      }

      // If there are rewards to claim
      if (iconTicketsToAdd > 0) {
        // Update claimed rewards in database
        for (let i = 0; i < updatedRewards.length; i++) {
          const reward = updatedRewards[i];
          if (reward.level <= userLevel) {
            // Check if reward for this level already exists
            const { data: existingReward, error: existingRewardError } = await supabase
              .from("claimed_rewards")
              .select("*")
              .eq("user_id", user.username)
              .eq("level", reward.level)
              .single();

            if (existingRewardError && existingRewardError.code !== "PGRST116") {
              console.error("Error checking existing reward:", existingRewardError);
              continue;
            }

            if (existingReward) {
              // Update existing reward
              const updateData = {
                icon_claimed: true,
              };

              await supabase
                .from("claimed_rewards")
                .update(updateData)
                .eq("id", existingReward.id);
            } else {
              // Create new reward record
              const insertData = {
                user_id: user.username,
                level: reward.level,
                icon_claimed: true,
                standard_claimed: false,
                premium_claimed: false,
              };

              await supabase.from("claimed_rewards").insert(insertData);
            }
          }
        }

        // Calculate new ticket count
        const newIconTicketCount = (user.icon_tickets || 0) + iconTicketsToAdd;

        // Update user's tickets in the database
        const { error: ticketUpdateError } = await supabase
          .from("users")
          .update({
            icon_tickets: newIconTicketCount,
          })
          .eq("username", user.username);

        if (ticketUpdateError) {
          console.error("Error updating tickets:", ticketUpdateError);
          toast({
            title: "Error",
            description: "Failed to update tickets",
            variant: "destructive",
          });
          return;
        }

        // Update auth context
        await updateUserTickets?.(user.tickets, user.elite_tickets, newIconTicketCount);

        // Update local state
        setLevelRewards(updatedRewards);
        setUnclaimedRewards(0);

        toast({
          title: "Rewards Claimed!",
          description: `You have claimed ${iconTicketsToAdd} icon ticket${iconTicketsToAdd > 1 ? 's' : ''}!`,
        });
      } else {
        toast({
          title: "No rewards to claim",
          description: "You have already claimed all available rewards.",
        });
      }
    } catch (error) {
      console.error("Error claiming all rewards:", error);
      toast({
        title: "Error",
        description: "Failed to claim rewards",
        variant: "destructive",
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200 p-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="flex items-center gap-2 text-yellow-800 hover:text-yellow-900 transition-colors">
          <Home className="h-5 w-5" />
          <span className="font-semibold">Back to Home</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-yellow-800">{user?.tickets || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-yellow-800">{user?.elite_tickets || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-yellow-800">{user?.icon_tickets || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl space-y-6">
        {/* Header Card */}
        <div className="bg-white/95 rounded-2xl shadow-xl border border-yellow-200 p-6 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Crown className="h-8 w-8 text-yellow-600 animate-bounce" />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full opacity-20 animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-bold text-yellow-500">Icon Pass</h1>
          </div>
          
          {success ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">Icon Pass ACTIVE!</div>
              <div className="text-yellow-700 mb-4">Your Icon Pass is now active and you can claim daily rewards!</div>
              
              {/* Daily Icon Ticket Claim */}
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-4 border border-yellow-300 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-semibold text-yellow-800">Daily Icon Ticket Claim</div>
                      <div className="text-sm text-yellow-700">
                        {claimedToday ? (
                          <span>Next claim available in: {nextClaimTime}</span>
                        ) : (
                          <span>Available to claim!</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleClaim}
                    disabled={claiming || claimedToday}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    {claiming ? 'Claiming...' : claimedToday ? 'Claimed' : 'Claim'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xl text-yellow-700 mb-6">Unlock exclusive Icon Pass benefits and daily rewards!</div>
              <Button
                onClick={handleBuy}
                disabled={buying}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg text-lg font-semibold"
              >
                {buying ? 'Processing...' : 'Buy Icon Pass (1.5 WLD)'}
              </Button>
            </div>
          )}
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-xl border border-yellow-300 p-6">
          <h2 className="text-2xl font-bold text-yellow-800 mb-4 text-center">Icon Pass Benefits</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Ticket className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <div className="font-semibold text-yellow-800">Daily Icon Ticket</div>
                <div className="text-sm text-yellow-700">Claim 1 Icon Ticket every 24 hours</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Ticket className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <div className="font-semibold text-yellow-800">Level Rewards</div>
                <div className="text-sm text-yellow-700">Earn Icon Tickets for each level reached</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <ArrowRight className="h-6 w-6 text-green-600 mt-1" />
              <div>
                <div className="font-semibold text-yellow-800">Improved Drop Rates</div>
                <div className="text-sm text-yellow-700">Better chances for rare cards in Elite Packs</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <div className="font-semibold text-yellow-800">7 Days Duration</div>
                <div className="text-sm text-yellow-700">Your Icon Pass is valid for 7 days from activation</div>
              </div>
            </div>
          </div>
        </div>
          
        {/* Improved Elite Pack Drop Rates Section */}
        <div className="mt-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-4 border border-yellow-300">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-yellow-600" />
            <div className="font-semibold text-yellow-800 text-sm">Improved Elite Pack Drop Rates</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-xs text-yellow-800">Basic</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-700">10%</span>
                <ArrowRight className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-700">7%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-yellow-800">Rare</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-700">40%</span>
                <ArrowRight className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-700">35%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs text-yellow-800">Elite</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-700">35%</span>
                <ArrowRight className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-700">40%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-yellow-800">Ultimate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-yellow-700">15%</span>
                <ArrowRight className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-700">18%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-yellow-700">
            Icon Pass significantly increases your chances of getting rare, elite, and ultimate cards in Elite Packs!
          </div>
        </div>
      </div>

      {/* Icon Pass Rewards */}
      {success && (
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-xl border border-yellow-300 p-6 flex flex-col items-center max-w-4xl w-full animate-fade-in mt-6">
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-yellow-800">Pass Rewards</h3>
              {unclaimedRewards > 0 && (
                <Button
                  onClick={handleClaimAllRewards}
                  disabled={isClaimingReward}
                  className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {isClaimingReward ? "Claiming..." : `Claim All (${unclaimedRewards})`}
                </Button>
              )}
            </div>

            <div
              className="overflow-x-auto pb-4 hide-scrollbar"
              style={{ scrollbarWidth: "none", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex flex-col min-w-max">
                {/* Icon rewards */}
                <div className="flex mb-2">
                  {levelRewards.map((reward) => (
                    <div key={`icon-${reward.level}`} className="flex flex-col items-center w-24">
                      <div className="h-20 flex flex-col items-center justify-end pb-2">
                        <div
                          className={`
                          w-20 h-16 rounded-lg flex flex-col items-center justify-center relative
                          ${
                            reward.level <= (user?.level || 1)
                              ? reward.iconClaimed
                                ? "bg-gray-100"
                                : reward.isSpecialLevel
                                  ? "bg-blue-200"
                                  : "bg-purple-100"
                              : "bg-gray-100"
                          }
                        `}
                        >
                          <Ticket className="h-5 w-5 text-blue-500 mb-1" />
                          <span className="text-xs font-medium">{reward.isSpecialLevel ? "5" : "1"} Icon</span>
                          {reward.isSpecialLevel && !reward.iconClaimed && reward.level <= (user?.level || 1) && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-1 rounded-full">
                              5x
                            </span>
                          )}

                          {reward.iconClaimed && (
                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Level markers */}
                <div className="flex items-center h-10 relative">
                  <div className="absolute left-0 right-0 h-0.5 bg-yellow-300"></div>

                  {levelRewards.map((reward) => (
                    <div
                      id={`level-${reward.level}`}
                      key={`level-${reward.level}`}
                      className={`flex flex-col items-center justify-center w-24 z-10`}
                    >
                      <div
                        className={`
                        w-6 h-6 rounded-full flex items-center justify-center
                        ${
                          reward.level === (user?.level || 1)
                            ? "bg-purple-500 text-white"
                            : reward.level < (user?.level || 1)
                              ? "bg-purple-200"
                              : "bg-gray-200"
                        }
                      `}
                      >
                        <span className="text-xs font-medium">{reward.level}</span>
                      </div>
                      <span className="text-[10px] mt-0.5 text-yellow-700">Level {reward.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex justify-center gap-4 text-xs text-yellow-700">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-200 mr-1"></div>
                <span>Icon Reward</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-200 mr-1"></div>
                <span>Premium Reward</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span>Claimed</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
