'use client'
import { Sparkles, CheckCircle, Clock, Zap, Home, Star, TrendingUp, Target, Award } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import Link from "next/link";

const benefitList = [
  {
    icon: <Zap className="h-5 w-5 text-blue-500" />,
    title: 'Double XP',
    desc: '7 days',
  },
  {
    icon: <Clock className="h-5 w-5 text-blue-500" />,
    title: 'Faster Rewards',
    desc: 'Unlock quicker',
  },
];

const featureList = [
  {
    icon: <Star className="h-4 w-4 text-yellow-500" />,
    title: 'Level Up Faster',
    desc: 'Gain experience twice as fast'
  },
  {
    icon: <TrendingUp className="h-4 w-4 text-green-500" />,
    title: 'Better Progress',
    desc: 'Unlock rewards quicker'
  },
  {
    icon: <Target className="h-4 w-4 text-red-500" />,
    title: 'Achieve Goals',
    desc: 'Reach milestones faster'
  },
  {
    icon: <Award className="h-4 w-4 text-purple-500" />,
    title: 'Exclusive Benefits',
    desc: 'Access premium features'
  }
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
      
      <main className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center px-4 py-8">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-blue-200 p-8 flex flex-col items-center w-full animate-fade-in drop-shadow-xl" style={{boxShadow:'0 8px 40px 0 rgba(0,80,200,0.18)'}}>
          {/* Header Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-10 w-10 text-blue-500 animate-bounce drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-400 tracking-tight drop-shadow-lg">XP Pass</h1>
            </div>
            <p className="text-gray-700 text-center text-base max-w-sm mb-6">Boost your XP gain for 7 days</p>
            
            {/* Main Benefits */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
              {benefitList.map((b, i) => (
                <div key={b.title} className="flex flex-col items-center p-4 rounded-xl shadow-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white transition-transform hover:scale-105 hover:shadow-2xl animate-fade-in" style={{animationDelay:`${i*0.1}s`}}>
                  <div className="mb-2">{b.icon}</div>
                  <div className="font-bold text-sm mb-1 drop-shadow">{b.title}</div>
                  <div className="text-xs opacity-90 text-center drop-shadow">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="w-full mb-8">
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-6">What you get with XP Pass</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featureList.map((feature, index) => (
                <div key={feature.title} className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-blue-200 hover:bg-white/80 transition-all duration-200 hover:scale-105">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-2">{feature.icon}</div>
                    <h3 className="font-semibold text-sm text-gray-800 mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* Purchase Section */}
          <div className="w-full max-w-md">
            {success ? (
              <div className="flex flex-col items-center gap-2 mt-2">
                <CheckCircle className="h-10 w-10 text-green-500 animate-bounce" />
                <div className="text-green-700 font-bold text-xl">XP Pass activated!</div>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  onClick={handleBuy}
                  disabled={buying}
                  className="w-full py-3 text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500 shadow-xl transition-all duration-150 animate-glow"
                >
                  {buying ? (
                    <span className="flex items-center gap-2"><span className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full"></span> Processing...</span>
                  ) : (
                    <span>Buy XP Pass (1 WLD)</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 