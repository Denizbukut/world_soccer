import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Generate a unique payment ID
    const paymentId = crypto.randomUUID().replace(/-/g, "");
    
    console.log('Creating payment ID:', paymentId);
    
    // Return the payment ID
    return NextResponse.json({ 
      id: paymentId,
      success: true 
    });
    
  } catch (error) {
    console.error("Error creating payment ID:", error);
    
    // Return a proper error response
    return NextResponse.json({ 
      error: "Failed to create payment ID",
      success: false 
    }, { 
      status: 500 
    });
  }
}
