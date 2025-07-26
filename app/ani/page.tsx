import MobileNav from "@/components/mobile-nav";

export default function KickOffPage() {
  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black"
      style={{ backgroundImage: 'url(/hintergrung.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
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
      <div className="max-w-xl w-full px-6 py-16 flex flex-col items-center justify-center text-center flex-1">
        <h1 className="text-3xl md:text-4xl font-extrabold text-yellow-400 mb-6 drop-shadow-lg">
          A football competition mode<br />featuring a weekend league is coming soon!
        </h1>
        <p className="text-lg md:text-xl text-gray-100 font-medium drop-shadow-md">
          Get ready for intense matches, strategic gameplay, and epic rewards in our upcoming competitive mode.
        </p>
      </div>
      {/* Mobile Navigation unten */}
      <MobileNav />
    </div>
  );
}
