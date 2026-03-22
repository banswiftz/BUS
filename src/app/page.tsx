"use client";

import { useState } from "react";
import { songs, Song } from "@/data/songs";
import { supabase } from "@/lib/supabase";
import Leaderboard from "@/components/Leaderboard";
import MultiplayerGame from "@/components/MultiplayerGame";

type ViewState = 'menu' | 'singleplayer' | 'multiplayer_lobby' | 'multiplayer_game' | 'leaderboard';

export default function Home() {
  const [view, setView] = useState<ViewState>('menu');

  // Singleplayer State
  const [unplayedSongs, setUnplayedSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [options, setOptions] = useState<Song[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Multiplayer State
  const [playerName, setPlayerName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);

  // --- SINGLEPLAYER LOGIC ---
  const startSingleplayer = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setUnplayedSongs(shuffled);
    setScore(0);
    setStreak(0);
    setLives(3);
    setIsGameOver(false);
    setSelectedOption(null);
    setView('singleplayer');
    pickNextSong(shuffled);
  };

  const pickNextSong = (availableSongs: Song[]) => {
    if (availableSongs.length === 0) {
      setIsGameOver(true);
      return;
    }

    const nextSong = availableSongs[0];
    const remaining = availableSongs.slice(1);
    setUnplayedSongs(remaining);
    setCurrentSong(nextSong);
    setSelectedOption(null);

    const otherSongs = songs.filter((s) => s.id !== nextSong.id);
    const shuffledOthers = otherSongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [nextSong, ...shuffledOthers].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const handleGuess = (songId: string) => {
    if (selectedOption || isGameOver) return;
    setSelectedOption(songId);

    const isCorrect = songId === currentSong?.id;

    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) setTimeout(() => setIsGameOver(true), 1500);
        return newLives;
      });
    }

    setTimeout(() => {
      if (lives > 0 || isCorrect) pickNextSong(unplayedSongs);
    }, 1500);
  };

  const submitScore = async () => {
    if (!playerName.trim() || submittingScore) return;
    setSubmittingScore(true);
    await supabase.from('leaderboards').insert([{ player_name: playerName, score }]);
    setSubmittingScore(false);
    setView('leaderboard');
  };

  // --- RENDER LOGIC ---
  if (view === 'menu') {
    return (
      <main className="main-container">
        <div className="glass-panel text-center animate-pop">
          <div className="header">
            <h1 className="title">Swiftie Lyric Guesser</h1>
            <p className="subtitle">Are you ready for it?</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
            <button className="btn-primary" onClick={startSingleplayer}>
              Singleplayer Hit
            </button>
            <button className="btn" onClick={() => setView('multiplayer_lobby')}>
              Multiplayer Room
            </button>
            <button className="btn" onClick={() => setView('leaderboard')}>
              Leaderboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === 'leaderboard') {
    return (
      <main className="main-container">
        <Leaderboard onBack={() => setView('menu')} />
      </main>
    );
  }

  if (view === 'multiplayer_lobby') {
    return (
      <main className="main-container">
        <div className="glass-panel text-center animate-pop">
          <div className="header">
            <h1 className="title" style={{ fontSize: '2.5rem' }}>Join Room</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto', marginBottom: '2rem' }}>
            <input 
              type="text" 
              placeholder="Your Name (e.g. Taylor)" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 w-full outline-none focus:border-white/50 transition-colors"
              style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <input 
              type="text" 
              placeholder="Room Name (e.g. 1989)" 
              value={roomName} 
              onChange={e => setRoomName(e.target.value.toLowerCase())}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 w-full outline-none focus:border-white/50 transition-colors"
              style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <button 
              className="btn-primary" 
              disabled={!playerName.trim() || !roomName.trim()}
              onClick={() => setView('multiplayer_game')}
            >
              Enter Room
            </button>
          </div>
          <button className="btn" onClick={() => setView('menu')} style={{ maxWidth: '300px', margin: '0 auto' }}>
            Back
          </button>
        </div>
      </main>
    );
  }

  if (view === 'multiplayer_game') {
    return (
      <main className="main-container">
        <MultiplayerGame roomName={roomName} playerName={playerName} onBack={() => setView('menu')} />
      </main>
    );
  }

  if (isGameOver) {
    return (
      <main className="main-container">
        <div className="glass-panel text-center animate-pop">
          <div className="header">
            <h1 className="title">Game Over!</h1>
            <p className="subtitle">You scored {score} points and survived {20 - unplayedSongs.length - (lives > 0 ? 0 : 1)} rounds.</p>
          </div>
          
          <div style={{ margin: '2rem auto', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Enter your name for Leaderboard" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value)}
              style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', outline: 'none', width: '100%' }}
            />
            <button className="btn-primary" onClick={submitScore} disabled={submittingScore || !playerName.trim()}>
              {submittingScore ? 'Submitting...' : 'Submit Score'}
            </button>
          </div>

          <div className="next-btn-container">
            <button className="btn" onClick={() => setView('menu')}>
              Back to Menu
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      <div className="glass-panel">
        <div className="header">
          <h1 className="title" style={{ fontSize: '2.5rem' }}>Guess The Song</h1>
        </div>

        <div className="stats-bar">
          <div className="score">Score: {score}</div>
          <div className="lives" style={{ color: 'var(--error-color)' }}>Lives: {"❤️".repeat(lives)}</div>
          <div className="streak">Streak: {streak} 🔥</div>
        </div>

        {currentSong && (
          <div className="lyric-box animate-pop" key={currentSong.id}>
            {currentSong.previewUrl && (
              <audio src={currentSong.previewUrl} autoPlay style={{ display: 'none' }} />
            )}
            <p className="lyric-text">"{currentSong.lyric}"</p>
          </div>
        )}

        <div className="choices-grid">
          {options.map((option) => {
            let btnClass = "btn";
            if (selectedOption) {
              if (option.id === currentSong?.id) {
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
      </div>
    </main>
  );
}
