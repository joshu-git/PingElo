import MatchDetails from "@/components/matches/MatchDetails";

type Props = {
    params: {
        id: string;
    };
};

export default function MatchPage({ params }: Props) {
    return <MatchDetails matchId={params.id} />;
}