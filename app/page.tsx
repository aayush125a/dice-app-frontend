"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";

const STREAK_CONTRACT = "0xbf9788EF7965aA8Cc544E0C060f48da468a97f85";
const GAME_CONTRACT = "0xcE6eDca0DebFd886cd8503207803b1810B6d7F47";

const STREAK_ABI = [
  {
    type: "function",
    name: "claimStreak",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const GAME_ABI = [
  {
    type: "function",
    name: "placeBet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const GAME_MODES = [
  { id: 0, name: "Classic", picks: 1, chance: "16.7%", multiplier: "5.76x" },
  { id: 1, name: "Risk", picks: null, chance: "Varies", multiplier: "Varies" },
  { id: 2, name: "Jackpot 2x", picks: 1, chance: "1/36", multiplier: "~35x" },
  { id: 3, name: "Jackpot 3x", picks: 1, chance: "1/216", multiplier: "~200x" },
];

const RISK_OPTIONS = [
  { picks: 1, chance: "16.7%", multiplier: "5.76x" },
  { picks: 2, chance: "33.3%", multiplier: "2.88x" },
  { picks: 3, chance: "50%",   multiplier: "1.92x" },
  { picks: 4, chance: "66.7%", multiplier: "1.44x" },
];

function useCountUp(target: number, durationMs = 1400, startDelayMs = 200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let startAt = 0;
    let delayTimeout = 0 as unknown as number;

    setValue(0);
    delayTimeout = window.setTimeout(() => {
      startAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startAt) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      window.clearTimeout(delayTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [durationMs, startDelayMs, target]);

  return value;
}

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function StatCard({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const v = useCountUp(value);
  return (
    <div className="premiumStat">
      <div className="premiumStat__label">{label}</div>
      <div className="premiumStat__value">
        {prefix}
        {formatCompact(v)}
        {suffix}
      </div>
    </div>
  );
}

function FloatingBackground() {
  const floaters = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: `${Math.round((i / 14) * 100)}%`,
        top: `${Math.round(((i * 37) % 100))}%`,
        delay: `${(i % 8) * 0.7}s`,
        dur: `${12 + (i % 7) * 2}s`,
        size: `${10 + (i % 6) * 8}px`,
        blur: `${(i % 4) * 0.5}px`,
        opacity: 0.08 + (i % 5) * 0.03,
      })),
    []
  );

  return (
    <div className="premiumBG" aria-hidden="true">
      <div className="premiumBG__gradient" />
      <div className="premiumBG__grid" />
      <div className="premiumBG__glow premiumBG__glow--one" />
      <div className="premiumBG__glow premiumBG__glow--two" />
      <div className="premiumBG__vignette" />
      <div className="premiumBG__particles">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="premiumParticle"
            style={{
              left: f.left,
              top: f.top,
              animationDelay: f.delay,
              animationDuration: f.dur,
              width: f.size,
              height: f.size,
              filter: `blur(${f.blur})`,
              opacity: f.opacity,
            }}
          />
        ))}
      </div>
      <div className="premiumBG__floatDice">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="floatingDie"
            style={{
              left: `${(i * 13) % 100}%`,
              top: `${(i * 19) % 100}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${14 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HeroDice() {
  return (
    <div className="heroDice">
      <div className="heroDice__spotlight" />
      <div className="diceWrap" aria-label="Rotating 3D dice">
        <div className="diceCube diceCube--ambientSpin">
          <div className="diceFace diceFace--front">{/* 1 */}<span className="pip pip--c" /></div>
          <div className="diceFace diceFace--back">{/* 6 */}
            <span className="pip pip--tl" /><span className="pip pip--ml" /><span className="pip pip--bl" />
            <span className="pip pip--tr" /><span className="pip pip--mr" /><span className="pip pip--br" />
          </div>
          <div className="diceFace diceFace--right">{/* 3 */}
            <span className="pip pip--tl" /><span className="pip pip--c" /><span className="pip pip--br" />
          </div>
          <div className="diceFace diceFace--left">{/* 4 */}
            <span className="pip pip--tl" /><span className="pip pip--bl" />
            <span className="pip pip--tr" /><span className="pip pip--br" />
          </div>
          <div className="diceFace diceFace--top">{/* 2 */}
            <span className="pip pip--tl" /><span className="pip pip--br" />
          </div>
          <div className="diceFace diceFace--bottom">{/* 5 */}
            <span className="pip pip--tl" /><span className="pip pip--bl" />
            <span className="pip pip--c" />
            <span className="pip pip--tr" /><span className="pip pip--br" />
          </div>
        </div>
        <div className="diceShadow" />
      </div>
    </div>
  );
}

function Landing({ isConnected }: { isConnected: boolean }) {
  return (
    <section className="premiumHero">
      <FloatingBackground />
      <div className="premiumHero__inner">
        <header className="premiumTopbar">
          <div className="brandLockup">
            <div className="brandMark" aria-hidden="true" />
            <div className="brandText">
              <div className="brandText__name">DICE</div>
              <div className="brandText__tag">Onchain luck. Studio-grade UX.</div>
            </div>
          </div>
          <div className="topbarWallet">
            <ConnectWallet className="connectWalletButton" />
          </div>
        </header>

        <div className="premiumHero__content">
          <div className="premiumHero__left">
            <h1 className="neonTitle" aria-label="DICE">
              <span className="neonTitle__glow">DICE</span>
            </h1>
            <p className="heroSubtitle">
              A premium crypto dice game with smooth animations, fast flow, and a high-end dark UI.
              Connect your wallet and roll.
            </p>

            <div className="heroStats">
              <StatCard label="Total Players" value={128_432} suffix="+" />
              <StatCard label="Total Bets" value={9_842_110} suffix="+" />
              <StatCard label="Biggest Win" value={2_450_000} prefix="$" />
            </div>

            <div className="heroCtas">
              <div className="ctaWrap">
                <ConnectWallet className="premiumCTA" />
                <div className="ctaHint">
                  {isConnected ? "Connected. Loading game…" : "Connect Wallet to Play"}
                </div>
              </div>
              <div className="trustRow" aria-hidden="true">
                <span className="trustPill">Non-custodial</span>
                <span className="trustPill">Fast confirmations</span>
                <span className="trustPill">Provably fair UX</span>
              </div>
            </div>
          </div>

          <div className="premiumHero__right">
            <HeroDice />
            <div className="heroDiceCaption">
              <span className="captionPill">Studio-grade motion</span>
              <span className="captionPill">Neon glow</span>
              <span className="captionPill">Premium depth</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Game({
  address,
}: {
  address?: `0x${string}`;
}) {
  const { writeContractAsync } = useWriteContract();

  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | null>(null);
  const [betTxHash, setBetTxHash] = useState<`0x${string}` | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const claimReceipt = useWaitForTransactionReceipt({
    hash: claimTxHash ?? undefined,
  });
  const betReceipt = useWaitForTransactionReceipt({
    hash: betTxHash ?? undefined,
  });

  const [selectedMode, setSelectedMode] = useState(0);
  const [selectedPicks, setSelectedPicks] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [riskPicks, setRiskPicks] = useState(1);
  const [result, setResult] = useState<null | { won: boolean; roll: number; payout: number }>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [diceIsTumbling, setDiceIsTumbling] = useState(false);
  const [diceRollId, setDiceRollId] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(100);
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(true);

  useEffect(() => {
    if (claimReceipt.isSuccess) {
      const reward = streak >= 7 ? 25 : [10, 12, 14, 16, 18, 20][streak] || 10;
      setTokenBalance((b) => b + reward);
      setStreak((s) => s + 1);
      setCanClaim(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimReceipt.isSuccess]);

  useEffect(() => {
    if (betReceipt.isSuccess) {
      setIsRolling(false);
    }
  }, [betReceipt.isSuccess]);

  const handlePickNumber = (num: number) => {
    const maxPicks = selectedMode === 1 ? riskPicks : 1;
    if (selectedPicks.includes(num)) {
      setSelectedPicks(selectedPicks.filter((p) => p !== num));
    } else if (selectedPicks.length < maxPicks) {
      setSelectedPicks([...selectedPicks, num]);
    }
  };

  const handleClaimStreak = async () => {
    setLastError(null);
    try {
      const hash = await writeContractAsync({
        address: STREAK_CONTRACT as `0x${string}`,
        abi: STREAK_ABI,
        functionName: "claimStreak",
      });
      setClaimTxHash(hash);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Failed to claim streak");
    }
  };

  const handlePlaceBet = async () => {
    if (selectedPicks.length === 0) return alert("Pick a number first!");
    if (betAmount > tokenBalance) return alert("Not enough tokens!");
    setLastError(null);
    setIsRolling(true);
    setResult(null);
    setDiceIsTumbling(true);
    setDiceRollId((v) => v + 1);

    try {
      const hash = await writeContractAsync({
        address: GAME_CONTRACT as `0x${string}`,
        abi: GAME_ABI,
        functionName: "placeBet",
      });
      setBetTxHash(hash);
    } catch (e) {
      setIsRolling(false);
      setDiceIsTumbling(false);
      setLastError(e instanceof Error ? e.message : "Failed to place bet");
      return;
    }

    // Keep the existing "dice roll" UX while the tx is pending/mining.
    await new Promise((r) => setTimeout(r, 1500));
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll as 1 | 2 | 3 | 4 | 5 | 6);
    setDiceIsTumbling(false);
    const won = selectedPicks.includes(roll);
    const multipliers: Record<number, number> = { 0: 5.76, 2: 35, 3: 200 };
    const riskMultipliers: Record<number, number> = { 1: 5.76, 2: 2.88, 3: 1.92, 4: 1.44 };
    const mult = selectedMode === 1 ? riskMultipliers[riskPicks] : multipliers[selectedMode];
    const payout = won ? Math.floor(betAmount * mult) : 0;
    if (won) setTokenBalance((b) => b + payout - betAmount);
    else setTokenBalance((b) => b - betAmount);
    setResult({ won, roll, payout });
  };

  return (
    <main className="premiumGameShell">
      <FloatingBackground />
      <div className="premiumGameShell__inner">
        <div className="w-full max-w-md flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <div className="brandMark brandMark--small" aria-hidden="true" />
            <h1 className="text-lg font-semibold tracking-wide">
              <span className="neonWord">DICE</span>
            </h1>
          </div>
          <ConnectWallet className="connectWalletButton" />
        </div>

        <div className="w-full max-w-md flex flex-col gap-4">
          {lastError && (
            <div className="bg-red-950/60 border border-red-900 text-red-200 rounded-2xl p-3 text-sm">
              {lastError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="premiumCard p-4">
              <p className="text-white/60 text-sm">Balance</p>
              <p className="text-2xl font-bold text-yellow-300">{tokenBalance} 🪙</p>
            </div>
            <div className="premiumCard p-4">
              <p className="text-white/60 text-sm">Streak</p>
              <p className="text-2xl font-bold text-orange-300">{streak} 🔥</p>
            </div>
          </div>

          {canClaim && (
            <button
              onClick={handleClaimStreak}
              disabled={claimReceipt.isLoading}
              className="w-full premiumButton premiumButton--warm"
            >
              {claimReceipt.isLoading
                ? "⏳ Claiming..."
                : `🎁 Claim Daily Streak (+${streak >= 7 ? 25 : [10, 12, 14, 16, 18, 20][streak] || 10} tokens)`}
            </button>
          )}

          {(claimTxHash || betTxHash) && (
            <div className="premiumCard p-4 text-sm text-white/70">
              {claimTxHash && (
                <div className="truncate">
                  Claim tx: <code>{claimTxHash}</code>
                </div>
              )}
              {betTxHash && (
                <div className="truncate mt-2">
                  Bet tx: <code>{betTxHash}</code>
                </div>
              )}
            </div>
          )}

          <div className="premiumCard p-4">
            <p className="text-white/60 text-sm mb-3">Game Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSelectedMode(mode.id);
                    setSelectedPicks([]);
                  }}
                  className={`p-3 rounded-xl text-sm font-semibold transition ${
                    selectedMode === mode.id
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  <div>{mode.name}</div>
                  <div className="text-xs opacity-70">{mode.multiplier}</div>
                </button>
              ))}
            </div>

            {selectedMode === 1 && (
              <div className="mt-3">
                <p className="text-white/60 text-xs mb-2">Pick count</p>
                <div className="grid grid-cols-4 gap-2">
                  {RISK_OPTIONS.map((opt) => (
                    <button
                      key={opt.picks}
                      onClick={() => {
                        setRiskPicks(opt.picks);
                        setSelectedPicks([]);
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold transition ${
                        riskPicks === opt.picks ? "bg-purple-600" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {opt.picks} ({opt.multiplier})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="premiumCard p-4">
            <p className="text-white/60 text-sm mb-3">
              Pick {selectedMode === 1 ? riskPicks : 1} number
              {(selectedMode === 1 && riskPicks > 1) ? "s" : ""}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePickNumber(num)}
                  className={`aspect-square rounded-xl text-xl font-bold transition ${
                    selectedPicks.includes(num)
                      ? "bg-blue-600 text-white scale-110"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="premiumCard p-4">
            <p className="text-white/60 text-sm mb-3">Bet Amount (max 100)</p>
            <div className="flex gap-2">
              {[5, 10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBetAmount(amt)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                    betAmount === amt ? "bg-yellow-400 text-black" : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <div className="premiumCard p-4">
            <div className="diceStage">
              <div className="diceSpotlight" />
              <div className="diceWrap" aria-label={`Dice shows ${diceValue}`}>
                <div
                  key={diceRollId}
                  className={[
                    "diceCube",
                    diceIsTumbling ? "diceCube--tumbling" : `diceCube--face-${diceValue}`,
                  ].join(" ")}
                >
                  <div className="diceFace diceFace--front">{/* 1 */}<span className="pip pip--c" /></div>
                  <div className="diceFace diceFace--back">{/* 6 */}
                    <span className="pip pip--tl" /><span className="pip pip--ml" /><span className="pip pip--bl" />
                    <span className="pip pip--tr" /><span className="pip pip--mr" /><span className="pip pip--br" />
                  </div>
                  <div className="diceFace diceFace--right">{/* 3 */}
                    <span className="pip pip--tl" /><span className="pip pip--c" /><span className="pip pip--br" />
                  </div>
                  <div className="diceFace diceFace--left">{/* 4 */}
                    <span className="pip pip--tl" /><span className="pip pip--bl" />
                    <span className="pip pip--tr" /><span className="pip pip--br" />
                  </div>
                  <div className="diceFace diceFace--top">{/* 2 */}
                    <span className="pip pip--tl" /><span className="pip pip--br" />
                  </div>
                  <div className="diceFace diceFace--bottom">{/* 5 */}
                    <span className="pip pip--tl" /><span className="pip pip--bl" />
                    <span className="pip pip--c" />
                    <span className="pip pip--tr" /><span className="pip pip--br" />
                  </div>
                </div>
                <div className={"diceShadow " + (diceIsTumbling ? "diceShadow--moving" : "")} />
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-white/60">
              {diceIsTumbling ? "Rolling..." : result ? `Landed on ${diceValue}` : "Ready to roll"}
            </div>
          </div>

          {result && (
            <div className={`rounded-2xl p-4 text-center ${result.won ? "bg-green-900/60" : "bg-red-900/60"}`}>
              <div className="text-4xl mb-2">{result.won ? "🎉" : "😔"}</div>
              <p className="font-bold text-lg">{result.won ? `Won ${result.payout} tokens!` : "Better luck next time!"}</p>
              <p className="text-white/70">Rolled: {result.roll}</p>
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={isRolling || selectedPicks.length === 0}
            className="w-full premiumButton premiumButton--primary"
          >
            {isRolling
              ? betReceipt.isLoading
                ? "⛏️ Waiting for confirmation..."
                : "🎲 Rolling..."
              : `🎲 Roll for ${betAmount} tokens`}
          </button>

          <div className="text-xs text-white/50 text-center pt-2">
            {address ? (
              <span className="truncate block">Connected: <code>{address}</code></span>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    if (isConnected) {
      const t = window.setTimeout(() => setShowGame(true), 250);
      return () => window.clearTimeout(t);
    }
    setShowGame(false);
  }, [isConnected]);

  return (
    <div className="premiumRoot">
      <div
        className={[
          "premiumLayer",
          isConnected ? "premiumLayer--out" : "premiumLayer--in",
        ].join(" ")}
      >
        <Landing isConnected={isConnected} />
      </div>

      <div
        className={[
          "premiumLayer",
          isConnected && showGame ? "premiumLayer--in" : "premiumLayer--out",
        ].join(" ")}
      >
        {isConnected ? <Game address={address} /> : null}
      </div>
    </div>
  );
}