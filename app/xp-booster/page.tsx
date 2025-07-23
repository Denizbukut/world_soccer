'use client'
import { Sparkles, CheckCircle, Clock, Zap, Home } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import Link from "next/link";

const benefitList = [
  {
    icon: <Zap className="h-8 w-8 text-blue-500 drop-shadow" />,
    title: 'Double XP for 1 week',
    desc: 'Earn double experience points on all activities for 7 days.',
    color: 'from-blue-400 to-blue-600',
  },
  {
    icon: <Clock className="h-8 w-8 text-cyan-500 drop-shadow" />,
    title: 'Unlock rewards faster',
    desc: 'Reduce the waiting time to claim your rewards and progress quicker.',
    color: 'from-cyan-400 to-blue-300',
  },
];

export default function XpBoosterPage() {
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    try {
      const wldAmount = 1;
      const recipient = "0xf41442bf1d3e7c629678cbd9e50ea263a6befdc3";
      const reference = `xp_pass_${Date.now()}`.slice(0, 36);
      const payload = {
        reference,
        to: recipient,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(wldAmount, Tokens.WLD).toString(),
          },
        ],
        description: "XP Pass Purchase",
      };
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      setBuying(false);
      if (finalPayload.status === "success") {
        setSuccess(true);
        toast({ title: 'XP Pass purchased!', description: 'You have successfully activated your XP Pass.' });
      } else {
        toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch (e) {
      setBuying(false);
      toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-400 to-cyan-300 animate-gradient-x">
      {/* Back to Home Button */}
      <Link href="/" className="fixed top-4 left-4 z-20">
        <Button variant="outline" className="flex items-center gap-2 px-4 py-2 rounded-full shadow bg-white/80 hover:bg-white">
          <Home className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-700">Back to Home</span>
        </Button>
      </Link>
      {/* Animated background sparkles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-blue-300 opacity-30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-cyan-200 opacity-30 rounded-full blur-3xl animate-pulse delay-2000" />
        <div className="absolute left-1/2 top-2/3 w-72 h-72 bg-blue-400 opacity-20 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>
      <main className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center px-4 py-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-blue-200 p-10 flex flex-col items-center w-full animate-fade-in drop-shadow-xl" style={{boxShadow:'0 8px 40px 0 rgba(0,80,200,0.18)'}}>
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-12 w-12 text-blue-500 animate-bounce drop-shadow-lg" />
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-400 tracking-tight drop-shadow-lg animate-glow">XP Pass</h1>
            </div>
            <p className="text-gray-700 text-center text-lg md:text-xl font-medium max-w-xl">Unlock the ultimate XP boost! Purchase the XP Pass to enjoy double XP for a whole week and unlock your rewards even faster. Level up your game and stand out from the crowd!</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 w-full mb-8">
            {benefitList.map((b, i) => (
              <div key={b.title} className={`flex flex-col items-center p-6 rounded-2xl shadow-lg bg-gradient-to-br ${b.color} text-white transition-transform hover:scale-105 hover:shadow-2xl animate-fade-in`} style={{animationDelay:`${i*0.1}s`}}>
                <div className="mb-2">{b.icon}</div>
                <div className="font-bold text-xl mb-1 drop-shadow">{b.title}</div>
                <div className="text-base opacity-90 text-center drop-shadow">{b.desc}</div>
              </div>
            ))}
          </div>
          {success ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <CheckCircle className="h-12 w-12 text-green-500 animate-bounce" />
              <div className="text-green-700 font-bold text-2xl">XP Pass activated!</div>
              <div className="text-gray-600 text-base">Enjoy your new benefits!</div>
            </div>
          ) : (
            <Button
              onClick={handleBuy}
              disabled={buying}
              className="w-full py-4 text-xl font-bold rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500 shadow-xl transition-all duration-150 animate-glow"
            >
              {buying ? (
                <span className="flex items-center gap-2"><span className="animate-spin h-6 w-6 border-2 border-t-transparent border-white rounded-full"></span> Processing payment...</span>
              ) : (
                <span>Buy now (1 WLD)</span>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
} 