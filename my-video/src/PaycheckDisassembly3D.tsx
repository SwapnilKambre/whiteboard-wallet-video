import React from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const NAVY = "#061625";
const NAVY2 = "#0B2D4A";
const GREEN = "#00C896";
const MINT = "#8FFFE0";
const WHITE = "#F4F7FA";
const GOLD = "#E9B95F";

const clamp = (v: number, input: number[], output: number[]) =>
  interpolate(v, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const ease = (v: number, a: number, b: number) =>
  interpolate(v, [a, b], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const FacetBlock: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  emissive?: string;
  opacity?: number;
}> = ({ position, size, color, rotation = [0, 0, 0], emissive = "#000000", opacity = 1 }) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissive === "#000000" ? 0 : 0.45}
      roughness={0.42}
      metalness={color === GOLD ? 0.62 : 0.22}
      transparent={opacity < 1}
      opacity={opacity}
    />
  </mesh>
);

const Coin: React.FC<{ position: [number, number, number]; scale?: number; rotation?: [number, number, number] }> =
  ({ position, scale = 1, rotation = [Math.PI / 2, 0, 0] }) => (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <cylinderGeometry args={[0.18, 0.18, 0.07, 8, 1]} />
      <meshStandardMaterial color={GOLD} metalness={0.78} roughness={0.28} />
    </mesh>
  );

const PayStubScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const open = ease(t, 0.35, 1.25);
  const split = ease(t, 2.2, 4.15);
  const bob = Math.sin(t * 1.2) * 0.035;
  const stubY = 0.08 + (1 - open) * -0.45;
  const stubRot = (1 - open) * -0.13;
  const splitAmount = split * 0.95;
  const lanes = [
    { label: "FEDERAL", amount: "$280.50", x: -3.55, y: 0.8, color: "#7CC8FF" },
    { label: "FICA", amount: "$229.50", x: -1.8, y: -1.0, color: "#B5A0FF" },
    { label: "STATE / LOCAL", amount: "$90.00", x: 0, y: 1.15, color: "#00C896" },
    { label: "HEALTH", amount: "$80.00", x: 1.8, y: -1.0, color: "#F2F5F7" },
    { label: "401(k)", amount: "$120.00", x: 3.55, y: 0.8, color: GOLD },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY, overflow: "hidden", fontFamily: "Inter, Arial, sans-serif", color: WHITE }}>
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{
          position: [Math.sin(t * 0.22) * 0.28, 0.35 + Math.sin(t * 0.31) * 0.08, 10.6 - ease(t, 0.6, 7.8) * 0.65],
          fov: 42 - ease(t, 0.6, 7.8) * 1.8,
        }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: "absolute", inset: 0, background: "transparent" }}
      >
        <color attach="background" args={[NAVY]} />
        <fog attach="fog" args={[NAVY, 11, 22]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[-4, 7, 6]} intensity={2.5} color="#D7FFF4" castShadow />
        <pointLight position={[4, 2, 2]} intensity={95} color={GREEN} distance={12} />
        <pointLight position={[-5, -2, 1]} intensity={70} color="#2464A0" distance={12} />

        {/* Graphic floor / stage */}
        <mesh position={[0, -2.2, -1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[24, 16]} />
          <meshStandardMaterial color="#081C2D" roughness={0.8} metalness={0.12} />
        </mesh>
        {Array.from({ length: 15 }, (_, i) => (
          <FacetBlock key={`grid-${i}`} position={[-7 + i, -2.14, -1.45]} size={[0.018, 0.012, 12]} color="#12394A" opacity={0.62} />
        ))}

        {/* Hero paycheck: layered paper slabs with clipped, geometric corners */}
        <group
          position={[0, stubY + bob, 0.2]}
          rotation={[stubRot + Math.sin(t * 0.48) * 0.018, (1 - open) * 0.12 + Math.sin(t * 0.22) * 0.035, Math.sin(t * 0.32) * 0.012]}
        >
          <FacetBlock position={[0, 0, -0.18]} size={[4.6, 2.72, 0.16]} color="#C5D3DC" rotation={[0, 0, -0.025]} />
          <FacetBlock position={[0, 0.04, -0.05]} size={[4.45, 2.62, 0.13]} color="#F5F1E8" rotation={[0, 0, 0.012]} />
          <FacetBlock position={[0, 0.82, 0.045]} size={[4.05, 0.38, 0.08]} color={NAVY2} />
          <FacetBlock position={[-1.4, 0.82, 0.1]} size={[0.62, 0.07, 0.04]} color={GREEN} />
          <FacetBlock position={[-0.28, 0.18, 0.1]} size={[2.95, 0.035, 0.04]} color="#B4C0C9" />
          <FacetBlock position={[-0.58, -0.28, 0.1]} size={[2.35, 0.035, 0.04]} color="#B4C0C9" />
          <FacetBlock position={[-0.8, -0.72, 0.1]} size={[1.9, 0.035, 0.04]} color="#B4C0C9" />
          <FacetBlock position={[1.23, -0.68, 0.13]} size={[1.48, 0.47, 0.07]} color={GREEN} emissive={GREEN} />
          <FacetBlock position={[1.23, -0.68, 0.18]} size={[1.32, 0.07, 0.03]} color={NAVY} />
          <Coin position={[-1.75, 0.45, 0.2]} scale={0.75} />
          <Coin position={[-1.75, -0.05, 0.2]} scale={0.75} />
          <Coin position={[-1.75, -0.55, 0.2]} scale={0.75} />
        </group>

        {/* Five streams split away from the stub. */}
        {lanes.map((lane, i) => {
          const side = lane.x < 0 ? -1 : 1;
          const originX = lane.x * 0.16;
          const targetX = lane.x * (0.52 + splitAmount * 0.48);
          const targetY = lane.y * (0.25 + splitAmount * 0.75);
          const visible = ease(t, 2.35 + i * 0.13, 3.1 + i * 0.13);
          const y0 = lane.y < 0 ? -0.05 : 0.12;
          return (
            <group key={lane.label}>
              <mesh
                position={[originX + (targetX - originX) * splitAmount, y0 + (targetY - y0) * splitAmount, 0.05]}
                rotation={[0.1, 0.2 * side, splitAmount * (i % 2 ? -0.18 : 0.18)]}
                scale={0.6 + visible * 0.4}
              >
                <octahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial color={lane.color} emissive={lane.color} emissiveIntensity={0.35} metalness={0.25} roughness={0.35} />
              </mesh>
              <FacetBlock
                position={[targetX, targetY, -0.2]}
                size={[1.34, 0.72, 0.12]}
                color={NAVY2}
                emissive={lane.color}
                opacity={visible}
              />
              <FacetBlock
                position={[targetX, targetY + 0.27, -0.11]}
                size={[1.34, 0.08, 0.06]}
                color={lane.color}
                opacity={visible}
              />
              <Coin position={[targetX - 0.43, targetY - 0.16, 0.02]} scale={0.42 + visible * 0.18} />
            </group>
          );
        })}

        {/* Floating paper shards add movement without noisy particles. */}
        {Array.from({ length: 18 }, (_, i) => {
          const angle = i * 2.399;
          const radius = 1.7 + (i % 5) * 0.31;
          const drift = ease(t, 1.0 + (i % 5) * 0.08, 3.2 + (i % 5) * 0.1);
          return (
            <mesh
              key={`shard-${i}`}
              position={[
                Math.cos(angle) * radius * (0.35 + drift * 0.7),
                Math.sin(angle) * radius * (0.25 + drift * 0.65) + Math.sin(t * 1.3 + i) * 0.06,
                -0.5 + (i % 4) * 0.13,
              ]}
              rotation={[angle * 0.6 + t * 0.05, angle, angle * 0.4]}
              scale={0.12 + (i % 4) * 0.035}
            >
              <tetrahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={i % 3 === 0 ? GREEN : i % 3 === 1 ? NAVY2 : "#D5E0E7"} metalness={0.22} roughness={0.42} />
            </mesh>
          );
        })}
      </ThreeCanvas>

      {/* 2D titles are deliberately outside the WebGL canvas for crisp type. */}
      <AbsoluteFill style={{ pointerEvents: "none", padding: "54px 72px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 950, letterSpacing: "0.16em" }}>THE WHITEBOARD WALLET</div>
            <div style={{ fontSize: 10, letterSpacing: "0.24em", color: "#9CB0BE", marginTop: 6 }}>MONEY. EXPLAINED SIMPLY.</div>
          </div>
          <div style={{ border: `1px solid ${GREEN}70`, borderRadius: 30, padding: "10px 16px", color: MINT, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", background: "#061625B8" }}>
            PAYCHECK AUDIT // 01
          </div>
        </div>

        <div style={{ position: "absolute", top: 122, left: 72, right: 72, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: MINT, letterSpacing: "0.28em", fontWeight: 900, opacity: 1 - ease(t, 7.0, 7.6) * 0.35 }}>THE $800 MYSTERY</div>
          <div style={{ fontSize: 54, fontWeight: 950, letterSpacing: "-0.055em", marginTop: 10, textShadow: "0 8px 30px #0008", transform: `translateY(${Math.sin(t * 0.6) * 2}px)` }}>
            $3,000 EARNED <span style={{ color: GREEN }}>→</span> $2,200 DEPOSITED
          </div>
        </div>

        <div style={{ position: "absolute", left: 72, right: 72, bottom: 58, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20 }}>
          <div style={{ width: 360, borderLeft: `4px solid ${GREEN}`, padding: "12px 18px", background: "linear-gradient(90deg,#061625E8,#06162555)", borderRadius: "0 10px 10px 0" }}>
            <div style={{ color: MINT, fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", marginBottom: 8 }}>WHAT HAPPENED TO THE GAP?</div>
            <div style={{ fontSize: 21, lineHeight: 1.2, fontWeight: 800 }}>{t < 7.25 ? "Five different paths. Not one mysterious fee." : "$800 accounted for. Mystery solved."}</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "end", maxWidth: 1120 }}>
            {lanes.map((lane, i) => {
              const show = ease(t, 2.6 + i * 0.12, 3.25 + i * 0.12);
              return (
                <div key={lane.label} style={{ opacity: show, transform: `translateY(${(1 - show) * 16}px)`, minWidth: 150, padding: "11px 14px", border: `1px solid ${lane.color}65`, borderRadius: 9, background: "#061625DB", boxShadow: `0 8px 24px #0005` }}>
                  <div style={{ fontSize: 10, color: lane.color, letterSpacing: "0.12em", fontWeight: 900 }}>{lane.label}</div>
                  <div style={{ fontSize: 20, marginTop: 5, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{lane.amount}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>

      {/* A cinematic reveal wash, fully frame-controlled and deterministic. */}
      <AbsoluteFill style={{ background: "white", opacity: clamp(frame, [0, 1, 3, 9], [0.16, 0.09, 0.025, 0]), mixBlendMode: "screen", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 30%, #020913C9 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 5, width: `${clamp(frame, [0, 299], [0, 100])}%`, background: `linear-gradient(90deg, ${NAVY2}, ${GREEN})`, boxShadow: `0 0 18px ${GREEN}88` }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}88, transparent)`, opacity: ease(t, 0.2, 1.1), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const PaycheckDisassembly3D: React.FC = () => <PayStubScene />;

export default PaycheckDisassembly3D;
