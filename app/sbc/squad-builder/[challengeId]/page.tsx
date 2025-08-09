import SquadBuilderPage from "../page"

export default function SquadBuilderDynamicPage({ params }: { params: { challengeId: string } }) {
  return <SquadBuilderPage params={params} />
} 