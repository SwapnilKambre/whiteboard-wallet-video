import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CameraMove, Scene } from "./Scene";
import { TimedCaptionOverlay } from "./TimedCaptionOverlay";
import { Outro } from "./Outro";
import timing from "./pay_stub_timing.json";


interface EquationTerm {
  amount: string;
  label: string;
  operatorBefore?: "+" | "−";
}

interface EquationVisualData {
  heading?: string;
  terms: EquationTerm[];
  result: {
    amount: string;
    label: string;
  };
}

interface EditorialVisualData {
  kicker: string;
  highlight: string;
  details?: string[];
}

interface TimelineItem {
  id: number;
  bgType: "navy" | "grid" | "slate";
  cam: CameraMove;
  h: string;
  sub: string;
  deductionTag?: string;
  runningBalance?: string;
  isWealthBenefit?: boolean;
  visualTreatment?: "default" | "equation" | "editorial";
  equationData?: EquationVisualData;
  editorialData?: EditorialVisualData;
}

// Scene start/end frames come from the audio-timed scene markers in
// pay_stub_timing.json, rather than adding estimated sec values together.
const TIMELINE: TimelineItem[] = [
  // ACT 1: THE $3,000 TO $2,200 HOOK
  { id: 1, bgType: "navy", cam: "settle-center", h: "GROSS PAY: $3,000.00 → NET PAY: $2,200.00", sub: "$3,000 earned − $800 deductions = $2,200 deposited" },
  {
    id: 2,
    bgType: "navy",
    cam: "push-in",
    h: "WHY AN $800 GAP FEELS LIKE A PENALTY",
    sub: "The missing $800 is a mix of taxes, coverage, and savings",
    visualTreatment: "editorial",
    editorialData: {
      kicker: "FOLLOW THE $800",
      highlight: "$800",
      details: ["TAXES", "COVERAGE", "SAVINGS"],
    },
  },
  { id: 3, bgType: "grid", cam: "pan-right", h: "PUTTING THE US PAY STUB UNDER THE MICROSCOPE", sub: "Three tax lines. Two benefit lines. One net-pay number.", visualTreatment: "editorial", editorialData: {"kicker": "THREE PARTS TO CHECK", "highlight": "net-pay number", "details": ["3 TAX LINES", "2 BENEFIT LINES", "1 NET-PAY NUMBER"]} },

  // ACT 2: VARIABLES & 3 WORKERS
  { id: 4, bgType: "grid", cam: "pull-out", h: "NOT EVERY $3,000 GROSS YIELDS THE SAME NET", sub: "Same gross pay; different W-4, location, and benefit choices", visualTreatment: "editorial", editorialData: {"kicker": "SAME GROSS. DIFFERENT OUTCOMES.", "highlight": "different W-4", "details": ["GROSS PAY", "W-4", "LOCATION", "BENEFITS"]} },
  { id: 5, bgType: "slate", cam: "pan-left", h: "COMPARING THREE WORKERS AT THE EXACT SAME PAY", sub: "$2,400 vs $2,200 vs $1,900 take-home in this example", visualTreatment: "editorial", editorialData: {"kicker": "THREE WORKERS. THREE OUTCOMES.", "highlight": "$2,200", "details": ["$2,400 TAKE-HOME", "$2,200 TAKE-HOME", "$1,900 TAKE-HOME"]} },
  { id: 6, bgType: "slate", cam: "drift-up", h: "THE PAYCHECK IS NOT A FLAT FEE", sub: "Withholding changes with your paperwork—not a flat fee", visualTreatment: "editorial", editorialData: {"kicker": "THE WITHHOLDING RULE", "highlight": "not a flat fee", "details": ["PAPERWORK", "WITHHOLDING", "TAKE-HOME PAY"]} },

  // ACT 3: PAY STUB ANATOMY
  { id: 7, bgType: "grid", cam: "push-in", h: "STRUCTURE OF A STANDARD PAY STUB", sub: "Start here: the full amount earned before employee deductions", deductionTag: "GROSS BASE", runningBalance: "$3,000.00" },
  { id: 8, bgType: "navy", cam: "pan-right", h: "THE PSYCHOLOGICAL TRICK OF DEDUCTIONS", sub: "A tax payment leaves your pocket; a 401(k) contribution builds savings", visualTreatment: "editorial", editorialData: {"kicker": "TWO DIFFERENT USES OF MONEY", "highlight": "builds savings", "details": ["TAX PAYMENT", "401(k) CONTRIBUTION"]} },
  { id: 9, bgType: "slate", cam: "settle-center", h: "READING YOUR STUB LIKE A PROFESSIONAL AUDITOR", sub: "Sort each line into taxes, insurance, or retirement savings", visualTreatment: "editorial", editorialData: {"kicker": "SORT EACH PAY-STUB LINE", "highlight": "retirement savings", "details": ["TAXES", "INSURANCE", "RETIREMENT"]} },

  // ACT 4: DEDUCTION #1 — FEDERAL TAX
  { id: 10, bgType: "grid", cam: "push-in", h: "1. FEDERAL INCOME TAX WITHHOLDING: -$280.50", sub: "$280.50 withheld now is credited toward your eventual tax bill", deductionTag: "-$280.50 FED", runningBalance: "$2,719.50" },
  { id: 11, bgType: "slate", cam: "pan-left", h: "YOUR EMPLOYER DOES NOT KNOW YOUR FINAL TAX LIABILITY", sub: "Payroll sees your job details—not every part of your household finances", visualTreatment: "editorial", editorialData: {"kicker": "WHAT PAYROLL CAN SEE", "highlight": "household finances", "details": ["JOB DETAILS", "HOUSEHOLD FINANCES"]}, deductionTag: "9.35% FED", runningBalance: "$2,719.50" },
  { id: 12, bgType: "grid", cam: "pull-out", h: "FORM W-4 DRIVES YOUR PER-PAYCHECK INSTALMENTS", sub: "Your W-4 tells payroll how to estimate federal withholding", visualTreatment: "editorial", editorialData: {"kicker": "THE WITHHOLDING PROCESS", "highlight": "W-4", "details": ["W-4", "PAYROLL", "WITHHOLDING"]} },
  { id: 13, bgType: "navy", cam: "drift-up", h: "FEDERAL WITHHOLDING AS AN ESCROW ACCOUNT", sub: "Withheld − actual tax owed = refund or balance due", visualTreatment: "editorial", editorialData: {"kicker": "THE TAX RECONCILIATION", "highlight": "refund or balance due", "details": ["WITHHELD", "ACTUAL TAX OWED", "REFUND / BALANCE DUE"]} },
  { id: 14, bgType: "slate", cam: "pan-right", h: "AVOIDING HUGE REFUNDS THAT ARE JUST OVERPAYMENTS", sub: "A large refund can mean too much was withheld during the year", visualTreatment: "editorial", editorialData: {"kicker": "WHY A REFUND HAPPENS", "highlight": "too much was withheld", "details": ["TAX WITHHELD", "ACTUAL TAX OWED", "POSSIBLE REFUND"]} },

  // ACT 5: DEDUCTIONS #2 & #3 — FICA & STATE
  {
    id: 15,
    bgType: "grid",
    cam: "push-in",
    h: "2. FICA TAXES: -$229.50 (7.65% STATUTORY RATE)",
    sub: "$186 Social Security + $43.50 Medicare = $229.50 FICA",
    deductionTag: "-$229.50 FICA",
    runningBalance: "$2,490.00",
    visualTreatment: "equation",
    equationData: {
      heading: "THE FICA MATH",
      terms: [
        { amount: "$186.00", label: "SOCIAL SECURITY" },
        { amount: "$43.50", label: "MEDICARE", operatorBefore: "+" },
      ],
      result: {
        amount: "$229.50",
        label: "TOTAL FICA TAX",
      },
    },
  },
  { id: 16, bgType: "navy", cam: "settle-center", h: "BUILDING FUTURE RETIREMENT & MEDICARE CREDITS", sub: "Your employer generally pays a separate matching share", visualTreatment: "editorial", editorialData: {"kicker": "TWO CONTRIBUTIONS", "highlight": "matching share", "details": ["EMPLOYEE SHARE", "EMPLOYER SHARE"]}, deductionTag: "FICA MATCH", runningBalance: "$2,490.00" },
  { id: 17, bgType: "grid", cam: "pan-left", h: "3. STATE & LOCAL WITHHOLDING: -$90.00", sub: "Illustrative state/local withholding: $90.00", deductionTag: "-$90.00 STATE", runningBalance: "$2,400.00" },
  { id: 18, bgType: "slate", cam: "pull-out", h: "TOTAL STATUTORY TAXES EQUAL EXACTLY $600.00", sub: "$280.50 + $229.50 + $90.00 = $600.00 in listed taxes", deductionTag: "-$600.00 TAX", runningBalance: "$2,400.00" },

  // ACT 6: DEDUCTIONS #4 & #5 — HEALTH & 401(k)
  { id: 19, bgType: "navy", cam: "push-in", h: "4. HEALTH INSURANCE PREMIUM: -$80.00", sub: "$80 buys health coverage; it is not the same as income tax", visualTreatment: "editorial", editorialData: {"kicker": "COVERAGE, NOT INCOME TAX", "highlight": "$80", "details": ["$80 PREMIUM", "HEALTH COVERAGE", "NOT INCOME TAX"]}, deductionTag: "-$80.00 HEALTH", runningBalance: "$2,320.00", isWealthBenefit: true },
  { id: 20, bgType: "grid", cam: "drift-up", h: "PRE-TAX DEDUCTIONS LOWER YOUR TAXABLE INCOME", sub: "Some eligible pre-tax benefits can lower taxable wages", visualTreatment: "editorial", editorialData: {"kicker": "THE PRE-TAX EFFECT", "highlight": "lower taxable wages", "details": ["ELIGIBLE BENEFITS", "TAXABLE WAGES"]}, deductionTag: "PRE-TAX SHIELD", runningBalance: "$2,320.00", isWealthBenefit: true },
  { id: 21, bgType: "slate", cam: "pan-right", h: "5. 401(k) RETIREMENT CONTRIBUTION: -$120.00", sub: "$120 goes to retirement instead of today’s bank deposit", visualTreatment: "editorial", editorialData: {"kicker": "TODAY VS. THE FUTURE", "highlight": "$120", "details": ["$120 CONTRIBUTION", "RETIREMENT", "TODAY'S DEPOSIT"]}, deductionTag: "-$120.00 401(k)", runningBalance: "$2,200.00", isWealthBenefit: true },
  { id: 22, bgType: "navy", cam: "settle-center", h: "UNLOCKING THE EMPLOYER MATCH", sub: "A match can add employer money; eligibility and vesting rules apply", visualTreatment: "editorial", editorialData: {"kicker": "HOW THE MATCH WORKS", "highlight": "employer money", "details": ["EMPLOYEE CONTRIBUTION", "EMPLOYER MATCH", "ELIGIBILITY", "VESTING"]}, deductionTag: "+$120 MATCH", runningBalance: "$2,200.00", isWealthBenefit: true },

  // ACT 7: FINAL REBUILD & AUDIT CHECKLIST
  { id: 23, bgType: "grid", cam: "pull-out", h: "REBUILDING THE CALCULATION FROM TOP TO BOTTOM", sub: "$3,000 − $600 taxes − $80 health − $120 401(k) = $2,200", visualTreatment: "editorial", editorialData: {"kicker": "PAYCHECK REBUILT", "highlight": "$2,200", "details": ["$3,000 GROSS", "−$600 TAXES", "−$80 HEALTH", "−$120 401(k)", "$2,200 NET"]}, deductionTag: "NET VERIFIED", runningBalance: "$2,200.00", isWealthBenefit: true },
  { id: 24, bgType: "slate", cam: "push-in", h: "FINAL AUDIT CHECKLIST FOR YOUR NEXT PAYDAY", sub: "Check gross pay, each deduction, net pay, then the bank deposit", visualTreatment: "editorial", editorialData: {"kicker": "YOUR PAYDAY CHECKLIST", "highlight": "gross pay", "details": ["GROSS PAY", "DEDUCTIONS", "NET PAY", "BANK DEPOSIT"]}, isWealthBenefit: true },
];

const SCENE_TIMING = timing.scenes;

const getBgPath = (type: TimelineItem["bgType"]) => {
  if (type === "navy") return staticFile("backgrounds/bg_papercut_navy.png");
  if (type === "grid") return staticFile("backgrounds/bg_lowpoly_grid.png");
  return staticFile("backgrounds/bg_paper_slate.png");
};

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B2D4A" }}>
      <Audio src={staticFile("audio.wav")} />

      {TIMELINE.map((item) => {
        const paddedIndex = String(item.id).padStart(2, "0");
        const cutoutPath = staticFile(`cutouts/cutout${paddedIndex}.png`);
        const sceneTiming = SCENE_TIMING[item.id - 1];
        const from = sceneTiming.startFrame30fps;
        const durationInFrames = sceneTiming.durationFrames30fps;

        return (
          <Sequence
            key={item.id}
            from={from}
            durationInFrames={durationInFrames}
          >
            <Scene
              sceneNumber={item.id}
              bgSrc={getBgPath(item.bgType)}
              cutoutSrc={cutoutPath}
              headline={item.h}
              subtext={item.sub}
              camera={item.cam}
              visualTreatment={item.visualTreatment ?? "default"}
              equationData={item.equationData}
              editorialData={item.editorialData}
              deductionTag={item.deductionTag}
              runningBalance={item.runningBalance}
              isWealthBenefit={item.isWealthBenefit}
              sceneDurationInFrames={durationInFrames}
              showEstimatedCaptions={false}
            />
          </Sequence>
        );
      })}

      {/* This overlay stays at composition time 0, so caption times match audio.wav. */}
      {/* Standalone 8-second branded outro; original scene timing remains unchanged. */}
      <Sequence from={11069} durationInFrames={240}>
        <Outro />
      </Sequence>

      <TimedCaptionOverlay cues={timing.captions} />
    </AbsoluteFill>
  );
};
