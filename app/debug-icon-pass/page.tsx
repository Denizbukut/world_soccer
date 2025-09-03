'use client'
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function DebugIconPassPage() {
  const { user } = useAuth();
  const [statusData, setStatusData] = useState<any>(null);
  const [claimData, setClaimData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const checkStatus = async () => {
    if (!user?.username) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/icon-pass/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user.username }),
      });

      const data = await response.json();
      console.log('🔍 Status API Response:', data);
      setStatusData(data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testClaim = async () => {
    if (!user?.username) return;
    
    setClaimLoading(true);
    try {
      const response = await fetch('/api/icon-pass/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user.username }),
      });

      const data = await response.json();
      console.log('🎯 Claim API Response:', data);
      setClaimData(data);
      
      // Refresh status after claim attempt
      if (response.ok) {
        setTimeout(checkStatus, 1000);
      }
    } catch (error) {
      console.error('Error testing claim:', error);
    } finally {
      setClaimLoading(false);
    }
  };

  useEffect(() => {
    if (user?.username) {
      checkStatus();
    }
  }, [user?.username]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Debug Icon Pass</h1>
          <p>Please log in to test the Icon Pass API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Debug Icon Pass - User: {user.username}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button 
            onClick={checkStatus} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </Button>
          
          <Button 
            onClick={testClaim} 
            disabled={claimLoading}
            variant="destructive"
            className="w-full"
          >
            {claimLoading ? 'Claiming...' : 'Test Claim'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Data */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Status API Response</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
              {statusData ? JSON.stringify(statusData, null, 2) : 'No status data'}
            </pre>
          </div>

          {/* Claim Data */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Claim API Response</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
              {claimData ? JSON.stringify(claimData, null, 2) : 'No claim data'}
            </pre>
          </div>
        </div>

        {/* Analysis */}
        {statusData && (
          <div className="bg-white p-4 rounded-lg shadow mt-4">
            <h2 className="text-lg font-semibold mb-2">Analysis</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Has Active Pass:</strong> {statusData.hasActivePass ? '✅ Yes' : '❌ No'}
              </div>
              {statusData.claimStatus && (
                <>
                  <div>
                    <strong>Can Claim:</strong> {statusData.claimStatus.canClaim ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Last Claim Time:</strong> {statusData.claimStatus.lastClaimTime || 'Never'}
                  </div>
                  <div>
                    <strong>Next Claim Time:</strong> {statusData.claimStatus.nextClaimTime || 'N/A'}
                  </div>
                  <div>
                    <strong>Time Until Next Claim:</strong> {statusData.claimStatus.timeUntilNextClaim || 'N/A'}
                  </div>
                </>
              )}
              {statusData.iconPass && (
                <>
                  <div>
                    <strong>Pass Expires:</strong> {statusData.iconPass.expires_at}
                  </div>
                  <div>
                    <strong>Remaining Time:</strong> {statusData.iconPass.remaining_time}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
