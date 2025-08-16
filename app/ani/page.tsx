import MobileNav from "@/components/mobile-nav";
import MatchSimulation from "@/components/match-simulation";

export default function KickOffPage() {
  return (
    <div
      className="relative w-full bg-black"
      style={{ 
        backgroundImage: 'url(/hintergrung.png)', 
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
        <MatchSimulation />
      </div>
      
      {/* Mobile Navigation unten */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <MobileNav />
      </div>
    </div>
  );
}
