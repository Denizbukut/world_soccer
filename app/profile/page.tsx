"use client"

import { useAuth } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/protected-route"
import MobileNav from "@/components/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function ProfilePage() {
  const { user, logout } = useAuth()

  return (
    <ProtectedRoute>
      <div className="pb-20">
        <header className="bg-orange-600 text-white p-4">
          <h1 className="text-2xl font-bold">My Profile</h1>
        </header>

        <main className="p-4 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-orange-600">
                  <AvatarFallback className="bg-orange-100 text-orange-800 text-xl">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{user?.username || "User"}</CardTitle>
                  <CardDescription>Joined April 2023</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">42</div>
                <p className="text-sm text-muted-foreground">Cards collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">7</div>
                <p className="text-sm text-muted-foreground">Completed trades</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-black">★</Badge>
                <div>
                  <p className="font-medium">Collector</p>
                  <p className="text-xs text-muted-foreground">Collected 25+ cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500">★</Badge>
                <div>
                  <p className="font-medium">Trader</p>
                  <p className="text-xs text-muted-foreground">Completed 5+ trades</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">★</Badge>
                <div>
                  <p className="font-medium">Legend</p>
                  <p className="text-xs text-muted-foreground">Collect a legendary card</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => logout()}
            variant="destructive"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  )
}
