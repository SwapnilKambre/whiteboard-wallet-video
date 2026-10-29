import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type PhraseCaptionCue = {
  id?: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type TimedCaptionOverlayProps = {
  cues: PhraseCaptionCue[];
  bottomOffset?: number;
  backdrop?: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Kinetic word-highlighting captions.
 * Cue boundaries come from the exported SRT. Word timing inside each cue is
 * estimated from word length and punctuation; this is a visual approximation,
 * not true forced alignment. Replace with word-level timestamps when available.
 */
function wordWeights(words: string[]): number[] {
  return words.map((word) => {
    const clean = word.replace(/[^a-z0-9$%]/gi, "");
    const length = Math.max(1, clean.length);
    const pause = /[,;:]$/.test(word) ? 0.55 : /[.!?]$/.test(word) ? 0.9 : 0;
    return Math.max(1, Math.sqrt(length) + pause);
  });
}

function getWeightedWordIndex(words: string[], progress: number): number {
  if (words.length <= 1) return 0;
  const weights = wordWeights(words);
  const target = clamp(progress, 0, 0.999999) * weights.reduce((sum, value) => sum + value, 0);
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (target < sum) return i;
  }
  return words.length - 1;
}

function getEstimatedWordStartFrame(words: string[], index: number, startFrame: number, endFrame: number): number {
  const weights = wordWeights(words);
  const total = weights.reduce((sum, value) => sum + value, 0);
  const before = weights.slice(0, index).reduce((sum, value) => sum + value, 0);
  return Math.round(startFrame + (before / total) * (endFrame - startFrame));
}

export const TimedCaptionOverlay: React.FC<TimedCaptionOverlayProps> = ({
  cues,
  bottomOffset,
  backdrop = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const scale = portrait ? width / 1080 : width / 1920;
  const now = frame / fps;
  const cue = cues.find((item) => now >= item.startSeconds && now < item.endSeconds);
  if (!cue) return null;

  const words = cue.text.trim().split(/\s+/).filter(Boolean);
  const startFrame = Math.round(cue.startSeconds * fps);
  const endFrame = Math.max(startFrame + 1, Math.round(cue.endSeconds * fps));
  const progress = (now - cue.startSeconds) / Math.max(0.001, cue.endSeconds - cue.startSeconds);
  const activeIndex = getWeightedWordIndex(words, progress);
  const enter = spring({ frame: frame - startFrame, fps, config: { damping: 17, stiffness: 180, mass: 0.62 } });
  const exit = interpolate(frame, [Math.max(startFrame, endFrame - 4), endFrame], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad),
  });
  const fontSize = (portrait ? 43 : 42) * scale;
  const bottom = bottomOffset ?? (portrait ? 260 * scale : 72 * scale);

  return (
    <div style={{
      position: "absolute", left: "50%", bottom,
      transform: `translateX(-50%) translateY(${(1-enter)*14*scale}px) scale(${0.985+enter*0.015})`,
      opacity: Math.min(enter, exit), width: "max-content", maxWidth: portrait ? "90%" : "84%",
      zIndex: 100, pointerEvents: "none", fontFamily: "Inter, Arial, Helvetica, sans-serif",
    }}>
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center",
        columnGap: 0.25*fontSize, rowGap: 0.10*fontSize,
        padding: backdrop ? `${0.30*fontSize}px ${0.48*fontSize}px` : 0,
        borderRadius: 0.22*fontSize,
        background: backdrop ? "linear-gradient(180deg, rgba(4,18,32,.93), rgba(4,18,32,.82))" : "transparent",
        border: backdrop ? `${1.1*scale}px solid rgba(0,200,150,.42)` : "none",
        boxShadow: backdrop ? "0 10px 30px rgba(0,0,0,.36), 0 0 22px rgba(0,200,150,.07)" : "none",
        textAlign: "center", lineHeight: 1.24, fontSize, fontWeight: 820, letterSpacing: "-0.025em",
      }}>
        {words.map((word, index) => {
          const active = index === activeIndex;
          const wordStart = getEstimatedWordStartFrame(words, index, startFrame, endFrame);
          const pop = active ? spring({ frame: Math.max(0, frame - wordStart), fps, config: { damping: 12, stiffness: 250, mass: 0.5 } }) : 1;
          return <span key={`${cue.id ?? cue.startSeconds}-${index}`} style={{
            display: "inline-block", whiteSpace: "pre", padding: active ? "0.02em 0.13em 0.07em" : "0.02em 0",
            borderRadius: "0.16em", color: active ? "#062D35" : "rgba(255,255,255,.88)",
            background: active ? "#00C896" : "transparent", fontWeight: active ? 950 : 760,
            transform: active ? `translateY(${(1-pop)*-2*scale}px) scale(${1+0.025*pop})` : "none",
            boxShadow: active ? "0 0 18px rgba(0,200,150,.22)" : "none",
          }}>{word}</span>;
        })}
      </div>
    </div>
  );
};

export default TimedCaptionOverlay;
