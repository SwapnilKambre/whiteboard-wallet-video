
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceGrotesk } = loadFont();
const { fontFamily: inter } = loadInter();

const NAVY = "#0B2D4A";
const DEEP_NAVY = "#061625";
const EMERALD = "#00C896";
const WHITE = "#FFFFFF";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const fadeOut = interpolate(frame, [216, 239], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandIn = interpolate(frame, [8, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const ctaIn = interpolate(frame, [42, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const taglineIn = interpolate(frame, [75, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const drift = Math.sin((frame / 30) * 0.65) * 3;

  const label: React.CSSProperties = {
    fontFamily: spaceGrotesk,
    fontWeight: 700,
    letterSpacing: 1.5,
  };

  const pill: React.CSSProperties = {
    border: "1px solid rgba(0,200,150,0.5)",
    borderRadius: 16,
    padding: "22px 30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    minWidth: 250,
    background: "rgba(255,255,255,0.04)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DEEP_NAVY,
        color: WHITE,
        fontFamily: spaceGrotesk,
        overflow: "hidden",
        opacity: fadeIn * fadeOut,
      }}
    >
      <Audio src={staticFile("outro.wav")} />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 34%, rgba(0,200,150,0.15), transparent 58%)",
        }}
      />

      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 49.8%, rgba(255,255,255,0.025) 50%, transparent 50.2%)",
          backgroundSize: "180px 180px",
          opacity: 0.42,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 7,
          background: EMERALD,
          transform: `scaleX(${fadeIn})`,
          transformOrigin: "left",
        }}
      />

      {/* Brand icon and channel name */}
      <div
        style={{
          position: "absolute",
          top: 65 + (1 - brandIn) * 22 + drift,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: brandIn,
          transform: `scale(${0.96 + brandIn * 0.04})`,
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle, rgba(0,200,150,0.12) 0%, transparent 70%)",
            filter: "drop-shadow(0 0 18px rgba(0,200,150,0.16))",
            borderRadius: "50%",
          }}
        >
          <Img
            src={staticFile("wallet-icon-transparent.png")}
            style={{
              width: 210,
              height: 210,
              objectFit: "contain",
            }}
          />
        </div>

        <div
          style={{
            fontFamily: spaceGrotesk,
            fontSize: 58,
            fontWeight: 700,
            marginTop: 2,
            letterSpacing: 0.5,
            textAlign: "center",
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: WHITE }}>THE </span>
          <span style={{ color: EMERALD }}>WHITEBOARD </span>
          <span style={{ color: WHITE }}>WALLET</span>
        </div>

        <div
          style={{
            width: 130,
            height: 5,
            borderRadius: 5,
            background: EMERALD,
            marginTop: 20,
          }}
        />
      </div>

      {/* Calls to action */}
      <div
        style={{
          position: "absolute",
          top: 510,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          opacity: ctaIn,
          transform: `translateY(${(1 - ctaIn) * 14}px)`,
        }}
      >
        <div style={pill}>
          <span style={{ color: EMERALD, fontSize: 28 }}>♥</span>
          <span style={{ ...label, fontSize: 23, letterSpacing: 1.5 }}>
            LIKE
          </span>
        </div>

        <div style={pill}>
          <span style={{ color: EMERALD, fontSize: 28 }}>●</span>
          <span style={{ ...label, fontSize: 23, letterSpacing: 1.5 }}>
            COMMENT
          </span>
        </div>

        <div
          style={{
            ...pill,
            background: "rgba(0,200,150,0.12)",
          }}
        >
          <span style={{ color: EMERALD, fontSize: 27 }}>▶</span>
          <span style={{ ...label, fontSize: 23, letterSpacing: 1 }}>
            SUBSCRIBE
          </span>
        </div>
      </div>

      {/* Brand tagline */}
      <div
        style={{
          position: "absolute",
          top: 700,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: taglineIn,
          transform: `translateY(${(1 - taglineIn) * 10}px)`,
        }}
      >
        <div
          style={{
            fontFamily: spaceGrotesk,
            color: EMERALD,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 5,
          }}
        >
          MONEY. EXPLAINED SIMPLY.
        </div>

        <div
          style={{
            fontFamily: inter,
            marginTop: 18,
            color: "rgba(255,255,255,0.65)",
            fontSize: 21,
            fontWeight: 400,
            letterSpacing: 2,
          }}
        >
          MAKE EVERY PAYCHECK COUNT
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 5,
          background: NAVY,
        }}
      />
    </AbsoluteFill>
  );
};
