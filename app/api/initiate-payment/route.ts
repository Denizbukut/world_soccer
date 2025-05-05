import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  

  const paymentId = crypto.randomUUID().replace(/-/g, "");

  try {
    console.log(paymentId)
    return NextResponse.json({ id: paymentId });
  } catch (error) {
    console.error("Error saving payment:", error);
    
  }
}
