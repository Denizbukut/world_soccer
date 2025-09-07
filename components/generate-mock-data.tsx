"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface MockMatch {
  user1: string
  user2: string
  score: string
  result: string
  possession: { home: number; away: number }
  shots: { home: number; away: number }
  shotsOnTarget: { home: number; away: number }
  matchEvents: string[]
}

interface MockDataResult {
  success: boolean
  message: string
  matches: MockMatch[]
  errors: string[]
}

export default function GenerateMockData() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<MockDataResult | null>(null)
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set())

  const toggleMatchExpansion = (index: number) => {
    const newExpanded = new Set(expandedMatches)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedMatches(newExpanded)
  }

  const handleGenerateMockData = async () => {
    setIsGenerating(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/generate-mock-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        toast({
          title: "Mock Data Generated",
          description: `Successfully generated ${data.matches.length} mock matches`,
        })
      } else {
        toast({
          title: "Generation Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error generating mock data:', error)
      toast({
        title: "Generation Failed",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Generate Mock Match Data</h3>
          <p className="text-sm text-gray-300">
            Create realistic mock match results for testing and demonstration
          </p>
        </div>
        
        <div className="text-center mb-6">
          <Button
            onClick={handleGenerateMockData}
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Mock Data...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Generate Mock Matches
              </>
            )}
          </Button>
        </div>
        
        {result && (
          <div className="space-y-4">
            <div className="text-center">
              <Badge 
                className={`px-4 py-2 ${
                  result.success 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}
              >
                {result.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {result.message}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    Generation Failed
                  </>
                )}
              </Badge>
            </div>
            
            {result.matches && result.matches.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Generated Mock Matches:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className="bg-gray-800/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">@{match.user1}</span>
                          <span className="text-gray-400">vs</span>
                          <span className="text-white font-medium">@{match.user2}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold">{match.score}</span>
                          <Badge 
                            className={`px-2 py-1 text-xs ${
                              match.result === 'win' 
                                ? 'bg-green-600 text-white' 
                                : match.result === 'loss'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}
                          >
                            {match.result}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMatchExpansion(index)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedMatches.has(index) ? (
                              <ChevronUp className="w-3 h-3 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Match Statistics */}
                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-300 mb-2">
                        <div>
                          <div className="font-semibold text-white mb-1">Possession</div>
                          <div className="flex justify-between">
                            <span>{match.possession.home}%</span>
                            <span>{match.possession.away}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white mb-1">Shots</div>
                          <div className="flex justify-between">
                            <span>{match.shots.home}</span>
                            <span>{match.shots.away}</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white mb-1">On Target</div>
                          <div className="flex justify-between">
                            <span>{match.shotsOnTarget.home}</span>
                            <span>{match.shotsOnTarget.away}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Match Events (Expandable) */}
                      {expandedMatches.has(index) && match.matchEvents && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="text-xs font-semibold text-white mb-2">Match Events:</div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {match.matchEvents.map((event, eventIndex) => (
                              <div key={eventIndex} className="text-xs text-gray-300 bg-gray-900/50 rounded px-2 py-1">
                                {event}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-red-400 mb-3">Errors:</h4>
                <div className="space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-red-400 text-sm bg-red-900/20 rounded p-2">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
