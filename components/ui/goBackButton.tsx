"use client"

import { Button } from "./button"

export default function GoBackButton() {
  return (
    <Button variant="outline" onClick={() => history.back()}>
      ← Back
    </Button>
  )
}
