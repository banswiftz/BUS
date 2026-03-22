"use client";

import { useEffect, useState } from "react";
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
  const [statusText, setStatusText] = useState("Waiting for host...");
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    const roomChannel = supabase.channel(`room_${roomName}`, {
      config: { presence: { key: playerName } },
    });

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const newPlayers: Record<string, Player> = {};
        let hostAssigned = false;

        Object.keys(state).forEach((key, index) => {
          if (index === 0 && key === playerName) {
            setIsHost(true);
            hostAssigned = true;
          }
          // Preserve score if exists, else 0
          newPlayers[key] = { name: key, score: players[key]?.score || 0 };
        });

        setPlayers((prev) => {
          const merged = { ...prev };
          Object.keys(newPlayers).forEach(k => {
            if (!merged[k]) merged[k] = newPlayers[k];
          });
          return merged;
        });

        if (hostAssigned && !currentSong) {
          setStatusText("You are the Host. Click Start when ready!");
        }
      })
      .on('broadcast', { event: 'game_state' }, (payload) => {
        if (payload.payload.type === 'NEW_SONG') {
          const song = songs.find(s => s.id === payload.payload.songId)!;
          setCurrentSong(song);
          setOptions(payload.payload.options);
          setSelectedOption(null);
          setStatusText("Guess the song!");
        } else if (payload.payload.type === 'CORRECT_GUESS') {
          const winner = payload.payload.playerName;
          setPlayers((prev) => ({
            ...prev,
            [winner]: { ...prev[winner], score: prev[winner].score + 1 }
          }));
          setStatusText(`${winner} guessed correctly!`);
          if (isHost) {
            setTimeout(hostPickNextSong, 2500);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({ name: playerName });
        }
      });

    setChannel(roomChannel);

    return () => {
      roomChannel.unsubscribe();
    };
  }, [roomName, playerName]);

  const hostPickNextSong = () => {
    if (!channel) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    const nextSong = shuffled[0];
    const otherSongs = shuffled.slice(1, 4);
    const allOptions = [nextSong, ...otherSongs].sort(() => Math.random() - 0.5);
    
    channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { type: 'NEW_SONG', songId: nextSong.id, options: allOptions }
    });
  };

  const handleGuess = (songId: string) => {
    if (selectedOption || !currentSong) return;
    setSelectedOption(songId);

    if (songId === currentSong.id) {
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

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem' }}>
        {Object.values(players).map(p => (
          <div key={p.name} style={{ fontWeight: p.name === playerName ? 'bold' : 'normal' }}>
            {p.name}: {p.score}
          </div>
        ))}
      </div>

      {isHost && !currentSong && (
        <button className="btn-primary mb-4" onClick={hostPickNextSong}>
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
