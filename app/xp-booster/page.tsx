import { Sparkles } from "lucide-react";

export default function XpBoosterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white rounded-xl shadow-md border border-blue-200 p-8 flex flex-col items-center">
        <Sparkles className="h-12 w-12 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-blue-700 mb-2">XP Booster</h1>
        <p className="text-gray-700 text-center mb-2">Hier kannst du deinen XP Booster aktivieren und für 1 Stunde doppelte Erfahrungspunkte sammeln!</p>
        {/* Hier könntest du später einen Aktivieren-Button oder weitere Infos einbauen */}
      </div>
    </div>
  );
} 