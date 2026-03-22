"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { songs, Song } from "@/data/songs";

type Player = {
  name: string;
  score: number;
};

export default function MultiplayerGame({ roomName, playerName, onBack }: { roomName: string; playerName: string; onBack: () => void }) {
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [options, setOptions] = useState<Song[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Connecting to room...");
  const [channel, setChannel] = useState<any>(null);

  // Keep latest state in refs to avoid stale closures in broadcast events
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  const isHostRef = useRef(isHost);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  useEffect(() => {
    let mounted = true;
    const roomChannel = supabase.channel(`room_${roomName}`, {
      config: { presence: { key: playerName } },
    });

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        if (!mounted) return;
        const state = roomChannel.presenceState();
        const allPresences = Object.values(state).flat() as any[];
        
        // Sort by joined_at to securely identify the true, first host.
        allPresences.sort((a, b) => a.joined_at - b.joined_at);
        
        if (allPresences.length > 0) {
          const hostPlayer = allPresences[0];
          const meIsHost = hostPlayer.name === playerName;
          setIsHost(meIsHost);
          
          if (meIsHost && !currentSong) {
            setStatusText("You are the Host. Click Start when ready!");
          } else if (!currentSong) {
            setStatusText(`Waiting for host (${hostPlayer.name})...`);
          }

          // Update player roster but keep scores
          setPlayers((prev) => {
            const next: Record<string, Player> = {};
            allPresences.forEach(p => {
              if (!next[p.name]) {
                next[p.name] = { name: p.name, score: prev[p.name]?.score || 0 };
              }
            });
            return next;
          });
        }
      })
      .on('broadcast', { event: 'game_state' }, (payload) => {
        if (!mounted) return;
        const data = payload.payload;
        if (data.type === 'NEW_SONG') {
          const song = songs.find(s => s.id === data.songId)!;
          setCurrentSong(song);
          setOptions(data.options);
          setSelectedOption(null);
          setStatusText("Guess the song!");
        } else if (data.type === 'CORRECT_GUESS') {
          const winner = data.playerName;
          
          setPlayers((prev) => ({
            ...prev,
            [winner]: { ...prev[winner], score: (prev[winner]?.score || 0) + 1 }
          }));
          
          setStatusText(`${winner} guessed correctly!`);
          
          if (isHostRef.current) {
            setTimeout(() => {
              if (mounted) hostPickNextSong(roomChannel);
            }, 2500);
          }
        }
      })
      .subscribe(async (status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          // Track with join time so the earliest joiner naturally becomes Host.
          await roomChannel.track({ name: playerName, joined_at: Date.now() });
        } else {
          setStatusText(`Connection status: ${status}`);
        }
      });

    setChannel(roomChannel);

    return () => {
      mounted = false;
      roomChannel.unsubscribe();
    };
  }, [roomName, playerName]);

  // Use passed channel to avoid stale refs if channel state hasn't updated
  const hostPickNextSong = (activeChannel = channel) => {
    if (!activeChannel) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    const nextSong = shuffled[0];
    const otherSongs = shuffled.slice(1, 4);
    const allOptions = [nextSong, ...otherSongs].sort(() => Math.random() - 0.5);
    
    activeChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { type: 'NEW_SONG', songId: nextSong.id, options: allOptions }
    });
  };

  const handleGuess = (songId: string) => {
    if (selectedOption || !currentSong) return;
    setSelectedOption(songId);

    if (songId === currentSong.id && channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { type: 'CORRECT_GUESS', playerName }
      });
    }
  };

  return (
    <div className="glass-panel text-center animate-pop">
      <div className="header">
        <h1 className="title" style={{ fontSize: '2rem' }}>Room: {roomName}</h1>
        <p className="subtitle">{statusText}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {Object.values(players).map(p => (
          <div key={p.name} className="glass-panel" style={{ padding: '1rem 2rem', width: 'auto', minWidth: '120px' }}>
            <div style={{ fontWeight: p.name === playerName ? '800' : '500', fontSize: '1.2rem', color: p.name === playerName ? 'var(--accent-color)' : 'white' }}>
              {p.name} {p.name === playerName ? "(You)" : ""}
            </div>
            <div className="score" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {p.score}
            </div>
          </div>
        ))}
      </div>

      {isHost && !currentSong && (
        <button className="btn-primary mb-4" onClick={() => hostPickNextSong(channel)}>
          Start Game
        </button>
      )}

      {currentSong && (
        <div className="lyric-box animate-pop" key={currentSong.id}>
          {currentSong.previewUrl && (
            <audio src={currentSong.previewUrl} autoPlay style={{ display: 'none' }} />
          )}
          <p className="lyric-text">"{currentSong.lyric}"</p>
        </div>
      )}

      {currentSong && (
        <div className="choices-grid">
          {options.map((option) => {
            let btnClass = "btn";
            if (selectedOption) {
              if (option.id === currentSong.id) {
                btnClass += " correct";
              } else if (option.id === selectedOption) {
                btnClass += " wrong shake";
              } else {
                btnClass += " correct-dim";
              }
            }

            return (
              <button
                key={option.id}
                className={btnClass}
                onClick={() => handleGuess(option.id)}
                disabled={selectedOption !== null}
              >
                {option.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4">
        <button className="btn" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={onBack}>
          Leave Room
        </button>
      </div>
    </div>
  );
}
