"use client";

import { useState } from "react";
import { songs, Song } from "@/data/songs";

export default function Home() {
  const [unplayedSongs, setUnplayedSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [options, setOptions] = useState<Song[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Initialize the game
  const startGame = () => {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    setUnplayedSongs(shuffled);
    setScore(0);
    setStreak(0);
    setLives(3);
    setIsGameOver(false);
    setSelectedOption(null);
    setGameStarted(true);
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

    // Generate options
    const otherSongs = songs.filter((s) => s.id !== nextSong.id);
    const shuffledOthers = otherSongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const allOptions = [nextSong, ...shuffledOthers].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const handleGuess = (songId: string) => {
    if (selectedOption || isGameOver) return; // Prevent multiple clicks

    setSelectedOption(songId);

    const isCorrect = songId === currentSong?.id;

    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
      setLives((l) => l - 1);
      if (lives - 1 <= 0) {
        setTimeout(() => setIsGameOver(true), 1500);
        return;
      }
    }

    setTimeout(() => {
      pickNextSong(unplayedSongs);
    }, 1500);
  };

  if (!gameStarted) {
    return (
      <main className="main-container">
        <div className="glass-panel text-center">
          <div className="header">
            <h1 className="title">Swiftie Lyric Guesser</h1>
            <p className="subtitle">Are you ready for it?</p>
          </div>
          <div className="next-btn-container">
            <button className="btn-primary" onClick={startGame}>
              Start Playing
            </button>
          </div>
        </div>
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
          <div className="next-btn-container">
            <button className="btn-primary" onClick={startGame}>
              Play Again
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
                btnClass += " correct-dim"; // Dim other buttons
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
