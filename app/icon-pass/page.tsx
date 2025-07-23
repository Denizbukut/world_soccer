'use client'
import { useState } from "react";
import { Crown, Clock, Home, Ticket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useAuth } from "@/contexts/auth-context";

export default function IconPassPage() {
  const { user, updateUserTickets, refreshUserData } = useAuth();
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedToday, setClaimedToday] = useState(() => {
    const lastClaim = localStorage.getItem('icon_ticket_last_claim');
    if (!lastClaim) return false;
    const last = new Date(lastClaim);
    const now = new Date();
    return last.toDateString() === now.toDateString();
  });
  const [claimingClassic, setClaimingClassic] = useState(false);
  const [claimingElite, setClaimingElite] = useState(false);
  const [claimingIcon, setClaimingIcon] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    try {
      const wldAmount = 3;
      const recipient = "0xf41442bf1d3e7c629678cbd9e50ea263a6befdc3";
      const reference = `icon_pass_${Date.now()}`.slice(0, 36);
      const payload = {
        reference,
        to: recipient,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(wldAmount, Tokens.WLD).toString(),
          },
        ],
        description: "Icon Pass Purchase",
      };
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      setBuying(false);
      if (finalPayload.status === "success") {
        setSuccess(true);
        toast({ title: 'Icon Pass purchased!', description: 'You have successfully activated your Icon Pass.' });
      } else {
        toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch (e) {
      setBuying(false);
      toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleClaim = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const newIconTickets = (user.icon_tickets || 0) + 1;
      await updateUserTickets(user.tickets, user.legendary_tickets, newIconTickets);
      await refreshUserData?.();
      localStorage.setItem('icon_ticket_last_claim', new Date().toISOString());
      setClaimedToday(true);
      toast({ title: 'Claimed!', description: 'You have claimed your daily icon ticket.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Could not claim icon ticket.', variant: 'destructive' });
    } finally {
      setClaiming(false);
    }
  };

  // Rewards-Claim-Handler (Demo: erhöht Tickets lokal)
  const handleClaimClassic = async () => {
    if (!user) return;
    setClaimingClassic(true);
    try {
      await updateUserTickets((user.tickets || 0) + 1, user.legendary_tickets, user.icon_tickets);
      await refreshUserData?.();
      toast({ title: 'Claimed!', description: 'You have claimed a classic ticket.' });
    } finally {
      setClaimingClassic(false);
    }
  };
  const handleClaimElite = async () => {
    if (!user) return;
    setClaimingElite(true);
    try {
      await updateUserTickets(user.tickets, (user.legendary_tickets || 0) + 1, user.icon_tickets);
      await refreshUserData?.();
      toast({ title: 'Claimed!', description: 'You have claimed an elite ticket.' });
    } finally {
      setClaimingElite(false);
    }
  };
  const handleClaimIcon = async () => {
    if (!user) return;
    setClaimingIcon(true);
    try {
      await updateUserTickets(user.tickets, user.legendary_tickets, (user.icon_tickets || 0) + 1);
      await refreshUserData?.();
      toast({ title: 'Claimed!', description: 'You have claimed an icon ticket.' });
    } finally {
      setClaimingIcon(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-400 to-blue-300 flex flex-col items-center justify-center py-6 px-2">
      {/* Header mit Ticket-Anzeige */}
      <div className="w-full max-w-lg mx-auto px-2 py-2 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-medium">Icon Pass</h1>
          <div className="flex items-center gap-1">
            {/* Classic Ticket */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100">
              <Ticket className="h-4 w-4 text-violet-500" />
              <span className="font-medium text-xs">{user?.tickets ?? 0}</span>
            </div>
            {/* Elite Ticket */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100">
              <Ticket className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-xs">{user?.legendary_tickets ?? 0}</span>
            </div>
            {/* Icon Ticket */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100">
              <Crown className="h-4 w-4 text-indigo-500" />
              <span className="font-medium text-xs">{user?.icon_tickets ?? 0}</span>
            </div>
          </div>
        </div>
        {/* Back to Home Button mittig */}
        <div className="flex justify-center mt-1">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2 px-3 py-1 rounded-full shadow bg-white/80 hover:bg-white text-xs">
              <Home className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-indigo-700">Back to Home</span>
            </Button>
          </Link>
        </div>
      </div>
      {/* Card */}
      <div className="bg-white/95 rounded-2xl shadow-xl border border-indigo-200 p-5 flex flex-col items-center max-w-md w-full animate-fade-in mt-4">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-9 w-9 text-indigo-500 animate-bounce drop-shadow-lg" />
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-indigo-400 to-blue-400 tracking-tight drop-shadow">Icon Pass</h1>
        </div>
        <p className="text-gray-700 text-center mb-2 text-base font-medium">Unlock exclusive Icon Ticket rewards and boost your Elite Pack drop rate! The Icon Pass is valid for 7 days.</p>
        {/* Kaufen-Button oder Status */}
        {success ? (
          <div className="flex flex-col items-center gap-1 mt-1">
            <Crown className="h-8 w-8 text-green-500 animate-bounce" />
            <div className="text-green-700 font-bold text-base">Icon Pass activated!</div>
            <div className="text-gray-600 text-xs">Enjoy your new benefits!</div>
          </div>
        ) : (
          <Button
            onClick={handleBuy}
            disabled={buying}
            className="w-full py-2 text-base font-bold rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 shadow-lg transition-all duration-150"
          >
            {buying ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"></span> Processing payment...</span>
            ) : (
              <span>Buy Icon Pass (3 WLD)</span>
            )}
          </Button>
        )}
        {/* Benefits */}
        <div className="space-y-2 w-full mt-4">
          <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
            <Crown className="h-6 w-6 text-indigo-500" />
            <div>
              <div className="font-bold text-indigo-700 text-sm">1 Icon Ticket per Level</div>
              <div className="text-xs text-indigo-800">Get 1 icon ticket for each level up</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
            <Crown className="h-6 w-6 text-indigo-500" />
            <div>
              <div className="font-bold text-indigo-700 text-sm">5 Icon Tickets every 5 Levels</div>
              <div className="text-xs text-indigo-800">Get 5 icon tickets for every 5th level up</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
            <Crown className="h-6 w-6 text-indigo-500" />
            <div>
              <div className="font-bold text-indigo-700 text-sm">Improved Elite Pack Drop Rate</div>
              <div className="text-xs text-indigo-800">Higher chance to get rare cards from Elite Packs</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-500" />
            <div>
              <div className="font-bold text-indigo-700 text-sm">Daily Icon Ticket Claim</div>
              <div className="text-xs text-indigo-800">Claim 1 icon ticket every 24 hours while your Icon Pass is active</div>
            </div>
            {success && (
              <div className="flex-1 flex justify-end">
                <Button
                  onClick={handleClaim}
                  disabled={claiming || claimedToday}
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-full px-3 py-1 text-xs font-bold shadow"
                >
                  {claiming ? 'Claiming...' : claimedToday ? 'Claimed' : 'Claim now'}
                </Button>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-blue-100 rounded-lg p-3 border border-indigo-100 flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-500" />
            <div>
              <div className="font-bold text-indigo-700 text-sm">7 Days Duration</div>
              <div className="text-xs text-indigo-800">Your Icon Pass is valid for 7 days from activation</div>
            </div>
          </div>
        </div>
        {/* Rewards Claim Section */}
        {success && (
          <div className="w-full mt-4 flex flex-col items-center">
            <h2 className="text-base font-bold text-indigo-700 mb-2">Pass Rewards</h2>
            <div className="flex gap-2 w-full justify-center">
              <Button onClick={handleClaimClassic} disabled={claimingClassic} className="flex items-center gap-1 bg-violet-100 text-violet-700 hover:bg-violet-200 px-3 py-1 rounded-full text-xs font-bold">
                <Ticket className="h-4 w-4" /> Classic
              </Button>
              <Button onClick={handleClaimElite} disabled={claimingElite} className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full text-xs font-bold">
                <Ticket className="h-4 w-4" /> Elite
              </Button>
              <Button onClick={handleClaimIcon} disabled={claimingIcon} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1 rounded-full text-xs font-bold">
                <Crown className="h-4 w-4" /> Icon
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
