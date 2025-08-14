"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X, Sparkles } from "lucide-react"
import Image from "next/image"

export default function AniBanner() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  if (!showBanner) return null

  return (
    <div className="mb-6 rounded-lg shadow-lg overflow-hidden">
             {/* Main Banner Section */}
       <div className="relative">

        {/* Banner Image */}
                 <Image
           src="/Banner_1_Eng.png"
           alt="Holdstation Swap Fest Banner"
           width={800}
           height={200}
           className="w-full h-auto"
           priority
         />

        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute bottom-4 right-4 z-20 p-3 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

             {/* Collapsible Content - Slides down like a real menu */}
       <div 
         className={`bg-gradient-to-b from-yellow-400 to-yellow-600 transition-all duration-300 ease-in-out overflow-hidden ${
           isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
         }`}
       >
         <div className="p-4 text-white">
           {/* Header */}
           <div className="text-center mb-3">
             <h2 className="text-xl font-bold mb-1">Holdstation Swap Fest</h2>
             <p className="text-sm">Grab Your Share of the $10,000 Pool (Swap from just $5)</p>
           </div>

           {/* Prize Pool Highlight */}
           <div className="bg-yellow-500 rounded-lg p-3 mb-3 relative overflow-hidden border border-white/20">
             <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-80"></div>
             <div className="relative z-10 flex items-center justify-between">
               <div>
                 <p className="text-white font-bold text-xs uppercase tracking-wide mb-1">
                   SWAP REWARD PRIZE POOL
                 </p>
                 <p className="text-2xl font-bold text-white drop-shadow-lg">
                   USD $10,000
                 </p>
               </div>
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                 <span className="text-xl">💰</span>
               </div>
             </div>
           </div>

                       {/* How to Join Section */}
            <div className="bg-white/10 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-white" />
                <h3 className="text-white font-semibold text-base">HOW TO JOIN</h3>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              
                             <div className="space-y-2">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                     1
                   </div>
                   <p className="text-white/95 text-sm leading-relaxed">
                     Open the in-app Swap powered by HOLDSTATION.
                   </p>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                     2
                   </div>
                   <p className="text-white/95 text-sm leading-relaxed">
                     Swap $5 or more of WLD or USDC for ANI (or vice-versa).
                   </p>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                     3
                   </div>
                   <p className="text-white/95 text-sm leading-relaxed">
                     Rewards are sent automatically every week—grab your slice of the $10,000 pool!
                   </p>
                 </div>
               </div>
            </div>

           {/* Tip Section */}
           <div className="bg-white/10 rounded-lg p-3">
             <div className="flex items-center gap-2 mb-1">
               <span className="text-yellow-300 text-base">💡</span>
               <h4 className="text-white font-semibold text-base">TIP:</h4>
             </div>
             <p className="text-white/95 text-sm">
               The more you swap, the bigger your slice.
             </p>
           </div>
         </div>
       </div>
    </div>
  )
}
