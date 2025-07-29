import { type NextRequest, NextResponse } from "next/server"
import { verifyCloudProof, type IVerifyResponse, type ISuccessResult } from "@worldcoin/minikit-js"

interface IRequestPayload {
  payload: ISuccessResult
  action: string
  signal?: string
}

export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload
  const app_id = `app_81194a47953b441d325cb47c8e632c95`
  const verifyRes = (await verifyCloudProof(payload, app_id, action, signal)) as IVerifyResponse
  console.log("verifying")
  const userId = payload.nullifier_hash

  if (verifyRes.success) {
    // This is where you should perform backend actions if the verification succeeds
    // Such as, setting a user as "verified" in a database
    try {
      console.log("accepted")
      return NextResponse.json({ verifyRes, status: 200, userId })
    } catch {
      return NextResponse.json({ error: "Server error", status: 500 })
    }
  } else {
    console.log("not accepted")
    // This is where you should handle errors from the World ID /verify endpoint.
    // Usually these errors are due to a user having already verified.
    return NextResponse.json({ verifyRes, status: 400 })
  }
}
