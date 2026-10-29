import React, { useMemo } from "react";
import {
  Img,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CameraMove =
  | "push-in"
  | "pull-out"
  | "pan-right"
  | "pan-left"
  | "drift-up"
  | "settle-center";

export interface SceneProps {
  sceneNumber: number;
  bgSrc: string;
  cutoutSrc: string;
  headline: string;
  subtext: string;
  camera: CameraMove;
  /** The exact voice-over line for this scene. Used only for legacy estimated captions. */
  narrationText?: string;
  /** Set false when using TimedCaptionOverlay at the root for audio-aligned phrase captions. */
  showEstimatedCaptions?: boolean;
  /** Set this to the actual Sequence length for correct scene-local exit/progress animations. */
  sceneDurationInFrames?: number;
  deductionTag?: string;
  runningBalance?: string;
  isWealthBenefit?: boolean;
  visualTreatment?: "default" | "equation" | "editorial";
  equationData?: {
    heading?: string;
    terms: {
      amount: string;
      label: string;
      operatorBefore?: "+" | "−";
    }[];
    result: {
      amount: string;
      label: string;
    };
  };
  editorialData?: {
    kicker: string;
    highlight: string;
    details?: string[];
  };
}

const NAVY = "#061625";
const NAVY_LIGHT = "#0B2D4A";
const EMERALD = "#00C896";
const WHITE = "#FFFFFF";

type TimedWord = {
  text: string;
  startFrame: number;
  endFrame: number;
};

const clampInterpolate = (
  value: number,
  input: number[],
  output: number[],
  easing?: (value: number) => number
) =>
  interpolate(value, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    ...(easing ? { easing } : {}),
  });

/**
 * Gives longer words and words ending in punctuation slightly more screen time.
 * These are approximate timings, not speech-recognition timestamps.
 */
const createCaptionSchedule = (
  text: string,
  durationInFrames: number,
  fps: number
): TimedWord[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const start = Math.min(Math.round(fps * 0.22), Math.floor(durationInFrames * 0.05));
  const end = Math.max(start + 1, durationInFrames - Math.round(fps * 0.38));
  const availableFrames = Math.max(words.length, end - start);
  const weights = words.map((word) => {
    const bareWord = word.replace(/[^a-z0-9]/gi, "");
    const lengthWeight = Math.min(bareWord.length, 13) * 0.035;
    const punctuationWeight = /[,;:]$/.test(word) ? 0.22 : /[.!?]$/.test(word) ? 0.42 : 0;
    return 1 + lengthWeight + punctuationWeight;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let consumed = 0;
  return words.map((word, index) => {
    const startFrame = start + Math.round((consumed / totalWeight) * availableFrames);
    consumed += weights[index];
    const endFrame =
      index === words.length - 1
        ? end
        : start + Math.round((consumed / totalWeight) * availableFrames);
    return { text: word, startFrame, endFrame: Math.max(startFrame + 1, endFrame) };
  });
};

export const Scene: React.FC<SceneProps> = ({
  sceneNumber,
  bgSrc,
  cutoutSrc,
  headline,
  subtext,
  camera,
  narrationText,
  showEstimatedCaptions = true,
  sceneDurationInFrames,
  deductionTag,
  runningBalance,
  isWealthBenefit = false,
  visualTreatment = "default",
  equationData,
  editorialData,
}) => {
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const { fps, width, height, durationInFrames: localDurationInFrames } = videoConfig;
  const isPortrait = height > width;
  const unit = isPortrait ? width / 1080 : width / 1920;
  const px = (value: number) => Math.round(value * unit);
  // Prefer the scene's actual Sequence duration; fall back for older integrations.
  const duration = Math.max(1, sceneDurationInFrames ?? localDurationInFrames);
  const progress = clampInterpolate(frame, [0, duration], [0, 1]);

  // Three alternating layouts prevent every scene from feeling like the same template.
  // 0: subject right / copy left; 1: subject left / copy right; 2: centered hero.
  const stageMode = sceneNumber % 3;
  const accent = isWealthBenefit ? EMERALD : "#19E6B6";
  const headlineWords = useMemo(
    () => headline.trim().split(/\s+/).filter(Boolean),
    [headline]
  );
  const captionWords = useMemo(
    () => createCaptionSchedule(narrationText?.trim() || headline, duration, fps),
    [narrationText, headline, duration, fps]
  );

  const activeWordIndex = Math.max(
    0,
    captionWords.findIndex((word) => frame >= word.startFrame && frame < word.endFrame) === -1
      ? frame < (captionWords[0]?.startFrame ?? 0)
        ? 0
        : captionWords.length - 1
      : captionWords.findIndex((word) => frame >= word.startFrame && frame < word.endFrame)
  );
  const phraseStart = Math.floor(activeWordIndex / 6) * 6;
  const visibleCaptionWords = captionWords.slice(
    phraseStart,
    Math.min(activeWordIndex + 1, phraseStart + 6)
  );
  const activeWordStart = captionWords[activeWordIndex]?.startFrame ?? 0;
  const activeCaptionPop = spring({
    frame: Math.max(0, frame - activeWordStart),
    fps,
    config: { damping: 10, stiffness: 220, mass: 0.55 },
  });

  const entrySpring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 125, mass: 0.8 },
  });

  // Slow, eased camera travel; no beat-based zoom punches or screen shake.
  const cameraProgress = Easing.inOut(Easing.cubic)(progress);
  const masterScale = 1;

  // Every camera style starts at the same scale to reduce jumps at cuts.
  const cameraScale =
    camera === "push-in"
      ? 1.035 + cameraProgress * 0.02
      : camera === "pull-out"
        ? 1.055 - cameraProgress * 0.02
        : camera === "settle-center"
          ? 1.045 - cameraProgress * 0.01
          : 1.035 + cameraProgress * 0.01;

  const defaultPan = stageMode === 0 ? -30 : stageMode === 1 ? 30 : 0;
  const cameraX =
    camera === "pan-right"
      ? -60 + cameraProgress * 120
      : camera === "pan-left"
        ? 60 - cameraProgress * 120
        : defaultPan * (1 - cameraProgress) +
          (stageMode === 0 ? 12 : stageMode === 1 ? -12 : 0) * cameraProgress;
  const cameraY =
    camera === "drift-up" ? 28 - cameraProgress * 56 : cameraProgress * -8;
  const bgPanX = cameraX;
  const bgPanY = cameraY;

  const subjectSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 18, stiffness: 80, mass: 0.95 },
  });
  const floatY = Math.sin(frame * 0.055) * 6;
  const floatRotate = Math.cos(frame * 0.04) * 0.9;
  const baseSubjectX = isPortrait
    ? stageMode === 0 ? px(56) : stageMode === 1 ? px(-56) : 0
    : stageMode === 0 ? px(425) : stageMode === 1 ? px(-425) : 0;
  const subjectX = clampInterpolate(
    subjectSpring, [0, 1], [baseSubjectX * 1.18, baseSubjectX]
  );
  const subjectY =
    clampInterpolate(
      subjectSpring,
      [0, 1],
      [px(isPortrait ? 155 : 120), isPortrait ? px(110) : stageMode === 2 ? px(70) : px(-8)]
    ) +
    floatY;
  const subjectScale = clampInterpolate(
    subjectSpring, [0, 1], [0.88, 1.0]
  );
  const subjectRotateY = clampInterpolate(
    subjectSpring,
    [0, 1],
    [stageMode === 0 ? -18 : 18, stageMode === 0 ? -5 : 5]
  );

  const headlineExit = clampInterpolate(
    frame,
    [Math.floor(duration * 0.34), Math.floor(duration * 0.43)],
    [0, 1],
    Easing.inOut(Easing.cubic)
  );
  const calloutStart = Math.floor(duration * 0.405);
  const calloutSpring = spring({
    frame: frame - calloutStart,
    fps,
    config: { damping: 14, stiffness: 145, mass: 0.72 },
  });
  const calloutOpacity = clampInterpolate(frame, [calloutStart, calloutStart + 8], [0, 1]);
  const lineProgress = clampInterpolate(
    frame,
    [calloutStart + 2, calloutStart + Math.round(fps * 0.45)],
    [0, 1],
    Easing.out(Easing.cubic)
  );

  const firstTaggedWord = headlineWords.find((word) => /\$|%|gross|net|fica|401\(k\)|w-4|tax|refund/i.test(word));
  const heroWord = (deductionTag || firstTaggedWord || headlineWords[0] || `#${sceneNumber}`)
    .replace(/[^a-z0-9$%().-]/gi, "")
    .slice(0, 18);
  const backgroundWordX = (stageMode === 0 ? -58 : stageMode === 1 ? 58 : 0) + progress * (stageMode === 0 ? 48 : -48);
  const headlineSize = isPortrait
    ? headline.length > 42 ? 49 : headline.length > 28 ? 59 : 68
    : headline.length > 42 ? 53 : headline.length > 28 ? 64 : 77;
  const titleLeft = isPortrait ? "7%" : stageMode === 0 ? "5.7%" : stageMode === 1 ? "auto" : "7%";
  const titleRight = isPortrait ? "7%" : stageMode === 1 ? "5.7%" : stageMode === 0 ? "auto" : "7%";
  const titleWidth = isPortrait ? "86%" : stageMode === 2 ? "86%" : "41%";

  const captionFadeIn = clampInterpolate(frame, [0, Math.round(fps * 0.28)], [0, 1]);
  const captionFadeOut = clampInterpolate(
    frame,
    [duration - Math.round(fps * 0.42), duration - 1],
    [1, 0]
  );

  // Extract the amounts from the existing scene copy.
  const equationAmounts = subtext.match(/\$[\d,]+(?:\.\d+)?/g) ?? [];
  const earnedAmount = equationAmounts[0] ?? "$3,000";
  const deductionAmount = equationAmounts[1] ?? "$800";
  const depositedAmount = equationAmounts[2] ?? "$2,200";

  // Stagger the figures so the math reveals in sequence.
  const equationEarnedProgress = clampInterpolate(
    frame, [calloutStart, calloutStart + 8], [0, 1],
    Easing.out(Easing.cubic)
  );
  const equationDeductionProgress = clampInterpolate(
    frame, [calloutStart + 8, calloutStart + 18], [0, 1],
    Easing.out(Easing.cubic)
  );
  const equationResultProgress = clampInterpolate(
    frame, [calloutStart + 20, calloutStart + 34], [0, 1],
    Easing.out(Easing.cubic)
  );

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        backgroundColor: NAVY,
        perspective: "1400px",
        isolation: "isolate",
        transform: `scale(${masterScale})`,
        transformOrigin: "center center",
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        color: WHITE,
      }}
    >
      {/* Background plate: slow camera travel + subtle darkening keeps all copy legible. */}
<Img
  src={bgSrc}
  style={{
    position: "absolute",
    inset: "-9%",
    width: "118%",
    height: "118%",
    objectFit: "cover",
    transform: `translate3d(${bgPanX}px, ${bgPanY}px, 0) scale(${cameraScale})`,
    filter: "brightness(0.72) contrast(1.12) saturate(0.82)",
  }}
  alt=""
/>

      {/* Cinematic grade, edge vignette and subtle paper/scan texture. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 52% 44%, rgba(0,200,150,0.15) 0%, rgba(6,22,37,0.08) 30%, rgba(2,8,16,0.72) 100%), linear-gradient(90deg, rgba(4,14,25,0.52), transparent 50%, rgba(4,14,25,0.3))",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          opacity: 0.12,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, rgba(0,200,150,0.05) 0px, transparent 1px, transparent 7px)",
          mixBlendMode: "soft-light",
        }}
      />

      {/* Giant depth word: acts like a designed backdrop, not a second headline. */}
      <div
        style={{
          position: "absolute",
          zIndex: 3,
          top: isPortrait ? "25%" : "17%",
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `translateX(${backgroundWordX}px)`,
          color: `rgba(255,255,255,${0.045 * (1 - calloutOpacity * 0.72)})`,
          WebkitTextStroke: `1.5px rgba(0,200,150,${0.16 * (1 - calloutOpacity * 0.72)})`,
          fontSize: isPortrait ? (heroWord.length > 10 ? 76 : 106) : (heroWord.length > 10 ? 142 : 205),
          fontWeight: 950,
          letterSpacing: "-0.065em",
          lineHeight: 0.9,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {heroWord}
      </div>

      {/* Floating subject: layered shadow and gentle 3D tilt give the cutout depth. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate3d(${subjectX}px, ${subjectY}px, 0) scale(${subjectScale}) rotateY(${subjectRotateY}deg) rotateZ(${floatRotate}deg)`,
          transformStyle: "preserve-3d",
          opacity: clampInterpolate(subjectSpring, [0, 1], [0.65, 1]),
        }}
      >
        <Img
          src={cutoutSrc}
          style={{
            maxWidth: isPortrait ? "88%" : stageMode === 2 ? "61%" : "65%",
            maxHeight: isPortrait ? "42%" : stageMode === 2 ? "55%" : "59%",
            objectFit: "contain",
            filter:
              "drop-shadow(0 42px 52px rgba(0,4,12,0.78)) drop-shadow(0 0 30px rgba(0,200,150,0.15))",
          }}
          alt={`Scene ${sceneNumber} visual`}
        />
      </div>

      {/* Brand bug / series identity. */}
      <div
        style={{
          position: "absolute",
          zIndex: 25,
          top: px(isPortrait ? 28 : 34),
          left: px(isPortrait ? 30 : 48),
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: clampInterpolate(entrySpring, [0, 1], [0, 1]),
          transform: `translateY(${clampInterpolate(entrySpring, [0, 1], [-16, 0])}px)`,
        }}
      >
        <div
          style={{
            width: px(isPortrait ? 30 : 34),
            height: px(isPortrait ? 30 : 34),
            display: "grid",
            placeItems: "center",
            borderRadius: 9,
            color: NAVY,
            background: accent,
            boxShadow: `0 0 24px ${accent}35`,
            fontSize: px(isPortrait ? 18 : 20),
            fontWeight: 950,
          }}
        >
          W
        </div>
        <div>
          <div style={{ fontSize: px(isPortrait ? 12 : 15), fontWeight: 950, letterSpacing: "0.12em" }}>
            THE WHITEBOARD WALLET
          </div>
          <div style={{ marginTop: 3, fontSize: px(isPortrait ? 8 : 10), color: "rgba(255,255,255,0.64)", letterSpacing: "0.18em", fontWeight: 800 }}>
            MONEY. EXPLAINED SIMPLY.
          </div>
        </div>
      </div>

      {/* Audit step HUD. */}
      <div
        style={{
          position: "absolute",
          zIndex: 26,
          top: px(isPortrait ? 28 : 37),
          right: px(isPortrait ? 28 : 48),
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: `${px(isPortrait ? 8 : 10)}px ${px(isPortrait ? 10 : 15)}px`,
          border: "1px solid rgba(255,255,255,0.16)",
          borderRadius: 999,
          background: "rgba(4,15,26,0.65)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 10px 32px rgba(0,0,0,0.28)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: px(isPortrait ? 9 : 12),
          fontWeight: 850,
          letterSpacing: "0.13em",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 50, background: accent, boxShadow: `0 0 12px ${accent}`, display: "inline-block" }} />
        <span style={{ color: "rgba(255,255,255,0.74)" }}>PAYCHECK AUDIT</span>
        <span style={{ color: accent }}>{String(sceneNumber).padStart(2, "0")} / 24</span>
      </div>

      {/* Kinetic title: larger, shorter and higher contrast than the original glass slab. */}
      <div
        style={{
          position: "absolute",
          zIndex: 20,
          top: isPortrait ? "14%" : stageMode === 2 ? "17%" : "25%",
          left: titleLeft,
          right: titleRight,
          width: titleWidth,
          opacity: 1 - headlineExit,
          transform: `translate3d(0, ${headlineExit * -38}px, 0)`,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 12px",
            marginBottom: px(isPortrait ? 13 : 20),
            borderRadius: 5,
            background: "rgba(0,200,150,0.13)",
            borderLeft: `3px solid ${accent}`,
            color: accent,
            fontSize: px(isPortrait ? 10 : 13),
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            transform: `translateX(${clampInterpolate(entrySpring, [0, 1], [-24, 0])}px)`,
          }}
        >
          {deductionTag ? `AUDIT ITEM // ${deductionTag}` : "THE PAYCHECK DECODED"}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: isPortrait || stageMode === 2 ? "center" : "flex-start",
            columnGap: px(isPortrait ? 10 : 15),
            rowGap: px(isPortrait ? 5 : 1),
            maxWidth: "100%",
            padding: isPortrait || stageMode === 2 ? `0 ${px(12)}px` : 0,
            textAlign: isPortrait || stageMode === 2 ? "center" : "left",
            textShadow: "0 5px 24px rgba(0,0,0,0.52)",
          }}
        >
          {headlineWords.map((word, index) => {
            const wordSpring = spring({
              frame: frame - 3 - index * 2,
              fps,
              config: { damping: 11, stiffness: 170, mass: 0.6 },
            });
            const normalized = word.toUpperCase().replace(/[^A-Z0-9$%().-]/g, "");
            const highlighted = /\$|%|GROSS|NET|FICA|401\(K\)|W-4|TAX|REFUND/.test(normalized);
            return (
              <span
                key={`${word}-${index}`}
                style={{
                  display: "inline-block",
                  padding: highlighted ? "0 7px 4px" : "0 0 4px",
                  marginTop: 0,
                  borderRadius: 6,
                  color: highlighted ? NAVY : WHITE,
                  background: highlighted ? accent : "transparent",
                  fontSize: px(headlineSize),
                  lineHeight: 0.99,
                  fontWeight: 950,
                  letterSpacing: "-0.055em",
                  transform: `translateY(${clampInterpolate(wordSpring, [0, 1], [42, 0])}px) scale(${clampInterpolate(wordSpring, [0, 1], [0.84, 1])})`,
                  opacity: wordSpring,
                  boxShadow: highlighted ? `0 8px 22px ${accent}22` : "none",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Connecting pointer / target appears with the second visual beat. */}
      <div
        style={{
          position: "absolute",
          zIndex: 17,
          top: isPortrait ? "48%" : "45%",
          left: isPortrait ? "50%" : stageMode === 0 ? "65.5%" : stageMode === 1 ? "31.5%" : "50%",
          width: 1,
          height: 1,
          opacity: calloutOpacity,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: px(isPortrait ? 34 : 42),
            height: px(isPortrait ? 34 : 42),
            left: px(isPortrait ? -17 : -21),
            top: px(isPortrait ? -17 : -21),
            border: `2px solid ${accent}`,
            borderRadius: "50%",
            boxShadow: `0 0 22px ${accent}55`,
            transform: `scale(${0.75 + calloutSpring * 0.25 + Math.sin(frame * 0.13) * 0.04})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: isPortrait ? px(-1) : stageMode === 0 ? px(-400) : 0,
            top: isPortrait ? 0 : -1,
            width: isPortrait ? 2 : px(400),
            height: isPortrait ? px(150) : 2,
            transformOrigin: isPortrait ? "center top" : stageMode === 0 ? "right center" : "left center",
            transform: `${isPortrait ? "scaleY" : "scaleX"}(${lineProgress})`,
            background: isPortrait
              ? `linear-gradient(180deg, ${accent}, transparent)`
              : `linear-gradient(90deg, transparent, ${accent})`,
          }}
        />
      </div>

      {sceneNumber === 1 ? (
        <div
          style={{
            position: "absolute",
            zIndex: 24,
            top: isPortrait ? "53%" : stageMode === 2 ? "21%" : "20%",
            left: isPortrait ? "50%" : stageMode === 0 ? "5.7%" : stageMode === 1 ? "auto" : "50%",
            right: isPortrait ? "auto" : stageMode === 1 ? "5.7%" : "auto",
            width: isPortrait ? "86%" : stageMode === 2 ? "min(980px, 78%)" : "min(690px, 43%)",
            transform: `translate3d(${isPortrait || stageMode === 2 ? "-50%" : "0"}, ${clampInterpolate(calloutSpring, [0, 1], [px(22), 0])}px, 0)`,
            opacity: calloutOpacity,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          {/* Editorial heading, not an enclosing UI card. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(10),
              marginBottom: px(isPortrait ? 15 : 23),
            }}
          >
            <div
              style={{
                width: px(isPortrait ? 26 : 38),
                height: 2,
                flexShrink: 0,
                background: accent,
                boxShadow: `0 0 12px ${accent}55`,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: px(isPortrait ? 9 : 12),
                fontWeight: 950,
                letterSpacing: "0.19em",
              }}
            >
              THE PAYCHECK MATH
            </span>
          </div>

          {/* Earned amount and deductions enter as separate beats. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
              alignItems: "center",
              gap: px(isPortrait ? 8 : 15),
            }}
          >
            <div
              style={{
                minWidth: 0,
                opacity: equationEarnedProgress,
                transform: `translateY(${(1 - equationEarnedProgress) * px(10)}px)`,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: px(isPortrait ? 9 : 11),
                  fontWeight: 850,
                  letterSpacing: "0.13em",
                  marginBottom: px(6),
                }}
              >
                EARNED
              </div>
              <div
                style={{
                  color: WHITE,
                  fontSize: px(isPortrait ? 29 : 40),
                  fontWeight: 950,
                  lineHeight: 1,
                  letterSpacing: "-0.055em",
                  whiteSpace: "nowrap",
                  textShadow: "0 4px 18px rgba(0,0,0,0.35)",
                }}
              >
                {earnedAmount}
              </div>
            </div>

            <div
              style={{
                color: "rgba(255,255,255,0.44)",
                fontSize: px(isPortrait ? 25 : 34),
                fontWeight: 500,
                paddingTop: px(15),
              }}
            >
              −
            </div>

            <div
              style={{
                minWidth: 0,
                opacity: equationDeductionProgress,
                transform: `translateY(${(1 - equationDeductionProgress) * px(10)}px)`,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: px(isPortrait ? 9 : 11),
                  fontWeight: 850,
                  letterSpacing: "0.13em",
                  marginBottom: px(6),
                }}
              >
                DEDUCTIONS
              </div>
              <div
                style={{
                  color: WHITE,
                  fontSize: px(isPortrait ? 29 : 40),
                  fontWeight: 950,
                  lineHeight: 1,
                  letterSpacing: "-0.055em",
                  whiteSpace: "nowrap",
                  textShadow: "0 4px 18px rgba(0,0,0,0.35)",
                }}
              >
                {deductionAmount}
              </div>
            </div>
          </div>

          {/* Separate the result with a fine rule, not a panel. */}
          <div
            style={{
              height: 1,
              marginTop: px(isPortrait ? 17 : 23),
              background: "linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.035))",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(isPortrait ? 11 : 16),
              marginTop: px(isPortrait ? 15 : 20),
              opacity: equationResultProgress,
              transform: `translateY(${(1 - equationResultProgress) * px(12)}px)`,
            }}
          >
            <div
              style={{
                color: accent,
                fontSize: px(isPortrait ? 33 : 48),
                fontWeight: 850,
                lineHeight: 1,
              }}
            >
              =
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: accent,
                  fontSize: px(isPortrait ? 37 : 51),
                  fontWeight: 950,
                  lineHeight: 0.98,
                  letterSpacing: "-0.06em",
                  textShadow: `0 0 22px ${accent}22`,
                  whiteSpace: "nowrap",
                }}
              >
                {depositedAmount}
              </div>
              <div
                style={{
                  color: WHITE,
                  fontSize: px(isPortrait ? 9 : 12),
                  fontWeight: 900,
                  letterSpacing: "0.105em",
                  marginTop: px(7),
                }}
              >
                DEPOSITED INTO YOUR ACCOUNT
              </div>
            </div>
          </div>

          <div
            style={{
              width: `${Math.max(14, lineProgress * 100)}%`,
              height: 2,
              marginTop: px(isPortrait ? 15 : 20),
              background: `linear-gradient(90deg, ${accent}, rgba(0,200,150,0.06))`,
              boxShadow: `0 0 12px ${accent}35`,
            }}
          />
        </div>
      ) : sceneNumber === 18 ? (
        <div
          style={{
            position: "absolute",
            zIndex: 24,
            top: isPortrait ? "53%" : "20%",
            left: isPortrait ? "50%" : "5.7%",
            right: "auto",
            width: isPortrait ? "86%" : "43%",
            transform: `translate3d(${isPortrait ? "-50%" : "0"}, ${clampInterpolate(calloutSpring, [0, 1], [px(22), 0])}px, 0)`,
            opacity: calloutOpacity,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(10),
              marginBottom: px(isPortrait ? 15 : 22),
            }}
          >
            <div
              style={{
                width: px(isPortrait ? 26 : 38),
                height: 2,
                background: accent,
                boxShadow: `0 0 12px ${accent}55`,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: px(isPortrait ? 9 : 12),
                fontWeight: 950,
                letterSpacing: "0.18em",
              }}
            >
              TAXES RECONCILED
            </span>
          </div>

          {/* Three real components from this scene's existing subtext. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr)",
              alignItems: "center",
              columnGap: px(isPortrait ? 5 : 8),
            }}
          >
            {[
              { amount: equationAmounts[0] ?? "$280.50", label: "FEDERAL", delay: 3 },
              { amount: equationAmounts[1] ?? "$229.50", label: "FICA", delay: 10 },
              { amount: equationAmounts[2] ?? "$90.00", label: "STATE / LOCAL", delay: 17 },
            ].map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.48)",
                      fontSize: px(isPortrait ? 19 : 25),
                      paddingTop: px(14),
                    }}
                  >
                    +
                  </span>
                )}
                <div
                  style={{
                    minWidth: 0,
                    opacity: clampInterpolate(
                      frame,
                      [calloutStart + item.delay, calloutStart + item.delay + 8],
                      [0, 1]
                    ),
                    transform: `translateY(${clampInterpolate(
                      frame,
                      [calloutStart + item.delay, calloutStart + item.delay + 8],
                      [px(8), 0]
                    )}px)`,
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.56)",
                      fontSize: px(isPortrait ? 7 : 9),
                      fontWeight: 850,
                      letterSpacing: "0.08em",
                      marginBottom: px(6),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: WHITE,
                      fontSize: px(isPortrait ? 19 : 27),
                      fontWeight: 950,
                      letterSpacing: "-0.055em",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.amount}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div
            style={{
              height: 1,
              marginTop: px(isPortrait ? 17 : 22),
              background: "linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.03))",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(isPortrait ? 10 : 14),
              marginTop: px(isPortrait ? 14 : 18),
              opacity: clampInterpolate(
                frame,
                [calloutStart + 24, calloutStart + 36],
                [0, 1]
              ),
              transform: `translateY(${clampInterpolate(
                frame,
                [calloutStart + 24, calloutStart + 36],
                [px(10), 0]
              )}px)`,
            }}
          >
            <span
              style={{
                color: accent,
                fontSize: px(isPortrait ? 29 : 43),
                fontWeight: 850,
                lineHeight: 1,
              }}
            >
              =
            </span>
            <div>
              <div
                style={{
                  color: accent,
                  fontSize: px(isPortrait ? 35 : 48),
                  fontWeight: 950,
                  lineHeight: 0.98,
                  letterSpacing: "-0.06em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {equationAmounts[3] ?? "$600.00"}
              </div>
              <div
                style={{
                  color: WHITE,
                  fontSize: px(isPortrait ? 8 : 10),
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  marginTop: px(7),
                }}
              >
                TOTAL STATUTORY TAXES
              </div>
            </div>
          </div>

          <div
            style={{
              width: `${Math.max(14, lineProgress * 100)}%`,
              height: 2,
              marginTop: px(isPortrait ? 14 : 19),
              background: `linear-gradient(90deg, ${accent}, rgba(0,200,150,0.06))`,
              boxShadow: `0 0 12px ${accent}35`,
            }}
          />
        </div>
      ) : visualTreatment === "equation" && equationData ? (
        <div
          style={{
            position: "absolute",
            zIndex: 24,
            top: isPortrait ? "53%" : stageMode === 2 ? "21%" : "20%",
            left: isPortrait ? "50%" : stageMode === 0 ? "5.7%" : stageMode === 1 ? "auto" : "5.7%",
            right: isPortrait ? "auto" : stageMode === 1 ? "5.7%" : "auto",
            width: isPortrait ? "86%" : stageMode === 2 ? "min(980px, 78%)" : "43%",
            transform: `translate3d(${isPortrait || stageMode === 2 ? "-50%" : "0"}, ${clampInterpolate(calloutSpring, [0, 1], [px(22), 0])}px, 0)`,
            opacity: calloutOpacity,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(10),
              marginBottom: px(isPortrait ? 15 : 22),
            }}
          >
            <div
              style={{
                width: px(isPortrait ? 26 : 38),
                height: 2,
                flexShrink: 0,
                background: accent,
                boxShadow: `0 0 12px ${accent}55`,
              }}
            />
            <span
              style={{
                color: accent,
                fontSize: px(isPortrait ? 9 : 12),
                fontWeight: 950,
                letterSpacing: "0.18em",
              }}
            >
              {equationData.heading ?? "THE CALCULATION"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: [
                "minmax(0, 1fr)",
                ...equationData.terms.slice(1).flatMap(() => [
                  "auto",
                  "minmax(0, 1fr)",
                ]),
              ].join(" "),
              alignItems: "center",
              columnGap: px(isPortrait ? 7 : 12),
            }}
          >
            {equationData.terms.map((term, index) => {
              const termStart = calloutStart + index * 8;
              const termProgress = clampInterpolate(
                frame,
                [termStart, termStart + 8],
                [0, 1],
                Easing.out(Easing.cubic)
              );

              return (
                <React.Fragment key={`${term.label}-${index}`}>
                  {index > 0 && (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.48)",
                        fontSize: px(isPortrait ? 20 : 27),
                        paddingTop: px(14),
                      }}
                    >
                      {term.operatorBefore ?? "+"}
                    </span>
                  )}

                  <div
                    style={{
                      minWidth: 0,
                      opacity: termProgress,
                      transform: `translateY(${(1 - termProgress) * px(8)}px)`,
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(255,255,255,0.56)",
                        fontSize: px(isPortrait ? 7 : 9),
                        fontWeight: 850,
                        letterSpacing: "0.08em",
                        marginBottom: px(6),
                        whiteSpace: "nowrap",
                      }}
                    >
                      {term.label}
                    </div>

                    <div
                      style={{
                        color: WHITE,
                        fontSize: px(isPortrait ? 19 : 27),
                        fontWeight: 950,
                        letterSpacing: "-0.055em",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {term.amount}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div
            style={{
              height: 1,
              marginTop: px(isPortrait ? 17 : 22),
              background: "linear-gradient(90deg, rgba(255,255,255,0.28), rgba(255,255,255,0.03))",
            }}
          />

          {(() => {
            const resultStart = calloutStart + equationData.terms.length * 8 + 4;
            const resultProgress = clampInterpolate(
              frame,
              [resultStart, resultStart + 12],
              [0, 1],
              Easing.out(Easing.cubic)
            );

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: px(isPortrait ? 10 : 14),
                  marginTop: px(isPortrait ? 14 : 18),
                  opacity: resultProgress,
                  transform: `translateY(${(1 - resultProgress) * px(10)}px)`,
                }}
              >
                <span
                  style={{
                    color: accent,
                    fontSize: px(isPortrait ? 29 : 43),
                    fontWeight: 850,
                    lineHeight: 1,
                  }}
                >
                  =
                </span>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: accent,
                      fontSize: px(isPortrait ? 35 : 48),
                      fontWeight: 950,
                      lineHeight: 0.98,
                      letterSpacing: "-0.06em",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      textShadow: `0 0 22px ${accent}22`,
                    }}
                  >
                    {equationData.result.amount}
                  </div>
                  <div
                    style={{
                      color: WHITE,
                      fontSize: px(isPortrait ? 8 : 10),
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      marginTop: px(7),
                    }}
                  >
                    {equationData.result.label}
                  </div>
                </div>
              </div>
            );
          })()}

          <div
            style={{
              width: `${Math.max(14, lineProgress * 100)}%`,
              height: 2,
              marginTop: px(isPortrait ? 14 : 19),
              background: `linear-gradient(90deg, ${accent}, rgba(0,200,150,0.06))`,
              boxShadow: `0 0 12px ${accent}35`,
            }}
          />
        </div>
      ) : visualTreatment === "editorial" ? (
        <div
          style={{
            position: "absolute",
            zIndex: 24,
            top: isPortrait ? "67%" : stageMode === 2 ? "21%" : "20%",
            left: isPortrait ? "50%" : stageMode === 0 ? "5.7%" : stageMode === 1 ? "auto" : "50%",
            right: isPortrait ? "auto" : stageMode === 1 ? "5.7%" : "auto",
            width: isPortrait ? "86%" : stageMode === 2 ? "min(980px, 78%)" : "min(690px, 43%)",
            transform: `translate3d(${isPortrait || stageMode === 2 ? "-50%" : "0"}, ${clampInterpolate(calloutSpring, [0, 1], [px(24), 0])}px, 0)`,
            opacity: calloutOpacity,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          {/* Offset cardstock edge gives the annotation physical depth. */}
          <div
            style={{
              position: "absolute",
              inset: "5px -5px -5px 5px",
              clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)",
              background: `linear-gradient(135deg, ${accent}30, rgba(3,15,26,0.18))`,
              border: `1px solid ${accent}60`,
            }}
          />

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              boxSizing: "border-box",
              padding: isPortrait ? `${px(15)}px ${px(17)}px` : "19px 23px",
              clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)",
              background: "linear-gradient(125deg, rgba(4,17,29,0.97), rgba(8,30,46,0.94))",
              border: `1px solid ${accent}65`,
              borderLeft: `4px solid ${accent}`,
              boxShadow: "0 22px 48px rgba(0,0,0,0.42), inset 0 1px rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: px(isPortrait ? 11 : 15),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <div
                  style={{
                    width: px(7),
                    height: px(7),
                    flexShrink: 0,
                    background: accent,
                    transform: "rotate(45deg)",
                    boxShadow: `0 0 12px ${accent}65`,
                  }}
                />
                <span
                  style={{
                    color: accent,
                    fontSize: px(isPortrait ? 9 : 11),
                    fontWeight: 950,
                    letterSpacing: "0.17em",
                    textTransform: "uppercase",
                  }}
                >
                  {editorialData?.kicker ?? (deductionTag ? "AUDIT NOTE" : "KEY INSIGHT")}
                </span>
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.42)",
                  fontSize: px(isPortrait ? 8 : 9),
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                }}
              >
                {String(sceneNumber).padStart(2, "0")} / 24
              </span>
            </div>

            <div
              style={{
                height: 1,
                marginBottom: px(isPortrait ? 12 : 15),
                background: "linear-gradient(90deg, rgba(255,255,255,0.23), rgba(255,255,255,0.025))",
              }}
            />

            <div
              style={{
                color: WHITE,
                fontSize: px(
                  isPortrait
                    ? subtext.length > 65 ? 25 : 29
                    : subtext.length > 85 ? 29 : subtext.length > 60 ? 32 : 37
                ),
                fontWeight: 820,
                lineHeight: 1.17,
                letterSpacing: "-0.035em",
                textShadow: "0 3px 14px rgba(0,0,0,0.32)",
                overflowWrap: "break-word",
              }}
            >
              {editorialData?.highlight && subtext.includes(editorialData.highlight)
                ? subtext.split(editorialData.highlight).map((part, index, parts) => (
                    <React.Fragment key={`${index}-${part}`}>
                      {part}
                      {index < parts.length - 1 && (
                        <span style={{ color: accent, textShadow: `0 0 18px ${accent}25` }}>
                          {editorialData.highlight}
                        </span>
                      )}
                    </React.Fragment>
                  ))
                : subtext}
            </div>

            {editorialData?.details && editorialData.details.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: px(7),
                  marginTop: px(isPortrait ? 13 : 17),
                }}
              >
                {editorialData.details.map((detail, index) => (
                  <div
                    key={`${detail}-${index}`}
                    style={{
                      padding: `${px(7)}px ${px(9)}px`,
                      background: "rgba(0,200,150,0.075)",
                      border: `1px solid ${accent}48`,
                      color: index === editorialData.details!.length - 1 ? accent : "rgba(255,255,255,0.84)",
                      fontSize: px(isPortrait ? 8 : 9),
                      fontWeight: 900,
                      letterSpacing: "0.07em",
                      lineHeight: 1.2,
                    }}
                  >
                    {detail}
                  </div>
                ))}
              </div>
            )}

            {(deductionTag || runningBalance) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: px(14),
                  marginTop: px(isPortrait ? 13 : 16),
                  paddingTop: px(10),
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {deductionTag && (
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: "rgba(255,255,255,0.48)", fontSize: px(8), fontWeight: 900, letterSpacing: "0.12em", marginBottom: 4 }}>
                      PAY-STUB LINE
                    </div>
                    <div style={{ color: accent, fontSize: px(isPortrait ? 11 : 13), fontWeight: 900, overflowWrap: "break-word" }}>
                      {deductionTag}
                    </div>
                  </div>
                )}
                {deductionTag && runningBalance && (
                  <div style={{ width: 1, background: "rgba(255,255,255,0.16)" }} />
                )}
                {runningBalance && (
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: "rgba(255,255,255,0.48)", fontSize: px(8), fontWeight: 900, letterSpacing: "0.12em", marginBottom: 4 }}>
                      REMAINING PAY
                    </div>
                    <div style={{ color: WHITE, fontSize: px(isPortrait ? 13 : 15), fontWeight: 950, fontVariantNumeric: "tabular-nums" }}>
                      {runningBalance}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                height: 2,
                marginTop: px(isPortrait ? 13 : 17),
                background: "rgba(255,255,255,0.09)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(14, lineProgress * 100)}%`,
                  background: `linear-gradient(90deg, ${accent}, rgba(0,200,150,0.12))`,
                  boxShadow: `0 0 12px ${accent}45`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main cinematic information plate for scenes without a specialized treatment. */}
          <div
            style={{
              position: "absolute",
              zIndex: 24,
              top: isPortrait ? "67%" : stageMode === 2 ? "21%" : "20%",
              left: isPortrait ? "50%" : stageMode === 0 ? "5.7%" : stageMode === 1 ? "auto" : "50%",
              right: isPortrait ? "auto" : stageMode === 1 ? "5.7%" : "auto",
              width: isPortrait ? "86%" : stageMode === 2 ? "min(980px, 78%)" : "min(690px, 43%)",
              transform: `translate3d(${isPortrait || stageMode === 2 ? "-50%" : "0"}, ${clampInterpolate(calloutSpring, [0, 1], [px(24), 0])}px, 0)`,
              opacity: calloutOpacity,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "5px -5px -5px 5px",
                clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)",
                background: `linear-gradient(135deg, ${accent}28, rgba(3,15,26,0.15))`,
                border: `1px solid ${accent}55`,
              }}
            />

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                boxSizing: "border-box",
                padding: isPortrait ? `${px(15)}px ${px(17)}px` : "19px 23px",
                clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)",
                background: "linear-gradient(125deg, rgba(4,17,29,0.97), rgba(8,30,46,0.94))",
                border: `1px solid ${accent}65`,
                borderLeft: `4px solid ${accent}`,
                boxShadow: "0 22px 48px rgba(0,0,0,0.42), inset 0 1px rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: px(isPortrait ? 11 : 15),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <div
                    style={{
                      width: px(7),
                      height: px(7),
                      flexShrink: 0,
                      background: accent,
                      transform: "rotate(45deg)",
                      boxShadow: `0 0 12px ${accent}65`,
                    }}
                  />
                  <span
                    style={{
                      color: accent,
                      fontSize: px(isPortrait ? 9 : 11),
                      fontWeight: 950,
                      letterSpacing: "0.17em",
                      textTransform: "uppercase",
                    }}
                  >
                    {deductionTag ? "PAYCHECK AUDIT / KEY LINE" : "THE IMPORTANT PART"}
                  </span>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    color: "rgba(255,255,255,0.42)",
                    fontSize: px(isPortrait ? 8 : 9),
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  {String(sceneNumber).padStart(2, "0")} / 24
                </span>
              </div>

              <div
                style={{
                  height: 1,
                  marginBottom: px(isPortrait ? 12 : 15),
                  background: "linear-gradient(90deg, rgba(255,255,255,0.23), rgba(255,255,255,0.025))",
                }}
              />

              <div
                style={{
                  color: WHITE,
                  fontSize: px(
                    isPortrait
                      ? subtext.length > 65 ? 25 : 29
                      : subtext.length > 85 ? 29 : subtext.length > 60 ? 32 : 37
                  ),
                  fontWeight: 820,
                  lineHeight: 1.17,
                  letterSpacing: "-0.035em",
                  textShadow: "0 3px 14px rgba(0,0,0,0.32)",
                  overflowWrap: "break-word",
                }}
              >
                {subtext}
              </div>

              <div
                style={{
                  height: 2,
                  marginTop: px(isPortrait ? 14 : 18),
                  background: "rgba(255,255,255,0.09)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(14, lineProgress * 100)}%`,
                    background: `linear-gradient(90deg, ${accent}, rgba(0,200,150,0.12))`,
                    boxShadow: `0 0 12px ${accent}40`,
                  }}
                />
              </div>
            </div>
          </div>

        </>
      )}

      {/* Paycheck ledger stays compact so it reads as an on-screen graphic, not a dashboard. */}
      {(deductionTag || runningBalance) && (
        <div
          style={{
            position: "absolute",
            zIndex: 29,
            top: 98,
            right: 48,
            display: "flex",
            alignItems: "stretch",
            gap: 20,
            padding: "13px 19px",
            border: `1px solid ${accent}80`,
            borderRadius: 12,
            background: "rgba(3,15,26,0.82)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 14px 36px rgba(0,0,0,0.3)",
            transform: `translateY(${clampInterpolate(entrySpring, [0, 1], [-28, 0])}px)`,
          }}
        >
          {deductionTag && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.58)", fontSize: px(isPortrait ? 8 : 10), fontWeight: 900, letterSpacing: "0.16em", marginBottom: 5 }}>
                DEDUCTION
              </div>
              <div style={{ color: accent, fontSize: px(isPortrait ? 18 : 25), fontWeight: 950, fontFamily: "ui-monospace, monospace", letterSpacing: "-0.04em" }}>
                {deductionTag}
              </div>
            </div>
          )}
          {deductionTag && runningBalance && (
            <div style={{ width: 1, background: "rgba(255,255,255,0.18)" }} />
          )}
          {runningBalance && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.58)", fontSize: px(isPortrait ? 8 : 10), fontWeight: 900, letterSpacing: "0.16em", marginBottom: 5 }}>
                REMAINING PAY
              </div>
              <div style={{ color: WHITE, fontSize: px(isPortrait ? 18 : 25), fontWeight: 950, fontFamily: "ui-monospace, monospace", letterSpacing: "-0.04em" }}>
                {runningBalance}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rolling kinetic subtitles: legacy estimated word timing. Disable when using TimedCaptionOverlay. */}
      {showEstimatedCaptions && (
      <div
        style={{
          position: "absolute",
          zIndex: 38,
          left: "50%",
          bottom: px(isPortrait ? 105 : 75),
          width: isPortrait ? "92%" : "min(1580px, 88%)",
          minHeight: px(isPortrait ? 72 : 76),
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: px(isPortrait ? 8 : 13),
          rowGap: px(isPortrait ? 5 : 7),
          padding: `${px(isPortrait ? 13 : 17)}px ${px(isPortrait ? 13 : 24)}px`,
          boxSizing: "border-box",
          borderRadius: 13,
          border: "1px solid rgba(255,255,255,0.13)",
          background: "linear-gradient(180deg, rgba(3,12,21,0.86), rgba(3,12,21,0.72))",
          boxShadow: "0 14px 36px rgba(0,0,0,0.34)",
          backdropFilter: "blur(10px)",
          transform: `translateX(-50%) translateY(${(1 - captionFadeIn) * 14}px)`,
          opacity: captionFadeIn * captionFadeOut,
          pointerEvents: "none",
        }}
      >
        {visibleCaptionWords.map((word, index) => {
          const absoluteIndex = phraseStart + index;
          const isActive = absoluteIndex === activeWordIndex;
          const tokenSpring = isActive ? activeCaptionPop : 1;
          return (
            <span
              key={`${absoluteIndex}-${word.text}`}
              style={{
                display: "inline-block",
                padding: isActive ? "4px 9px 6px" : "4px 0 6px",
                borderRadius: 6,
                color: isActive ? NAVY : WHITE,
                background: isActive ? accent : "transparent",
                fontSize: px(isPortrait ? 31 : 40),
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: "-0.045em",
                textShadow: isActive ? "none" : "0 3px 12px rgba(0,0,0,0.7)",
                transform: `translateY(${isActive ? (1 - tokenSpring) * 8 : 0}px) scale(${isActive ? 0.94 + tokenSpring * 0.06 : 1})`,
                boxShadow: isActive ? `0 5px 18px ${accent}30` : "none",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
      )}

      {/* Persistent progress and subtle current-scene marker. */}
      <div style={{ position: "absolute", zIndex: 45, left: 0, right: 0, bottom: 0, height: 7, background: "rgba(255,255,255,0.12)" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${NAVY_LIGHT}, ${accent})`, boxShadow: `0 0 16px ${accent}85` }} />
      </div>
      <div
        style={{
          position: "absolute",
          zIndex: 44,
          bottom: px(isPortrait ? 23 : 22),
          right: px(isPortrait ? 28 : 48),
          color: "rgba(255,255,255,0.52)",
          fontFamily: "ui-monospace, monospace",
          fontSize: px(isPortrait ? 8 : 11),
          fontWeight: 800,
          letterSpacing: "0.17em",
        }}
      >
        {String(Math.round(progress * 100)).padStart(2, "0")}% AUDIT IN PROGRESS
      </div>

    </div>
  );
};
