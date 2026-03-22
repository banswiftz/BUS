import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ScoreEntry = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

export default function Leaderboard({ onBack }: { onBack: () => void }) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const { data, error } = await supabase
        .from("leaderboards")
        .select("*")
        .order("score", { ascending: false })
        .limit(10);

      if (data) setScores(data);
      setLoading(false);
    };

    fetchScores();
  }, []);

  return (
    <div className="glass-panel text-center animate-pop">
      <div className="header">
        <h1 className="title" style={{ fontSize: '2.5rem' }}>Top Swifties 👑</h1>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          {scores.length === 0 ? <p className="text-center">No scores yet! Be the first!</p> : null}
          {scores.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ fontWeight: 600 }}>#{i + 1} {s.player_name}</span>
              <span className="score">{s.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary" onClick={onBack}>
        Back to Menu
      </button>
    </div>
  );
}
