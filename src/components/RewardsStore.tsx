import React, { useState } from "react";
import { 
  Zap, 
  Clock, 
  Coffee, 
  Sun, 
  Sparkles, 
  Calendar,
  CheckCircle,
  Loader2,
  Trophy
} from "lucide-react";
import { Reward, TeamMember } from "../types";

interface RewardsStoreProps {
  rewards: Reward[];
  currentUser: TeamMember;
  redeemReward: (rewardId: string) => Promise<void>;
}

export default function RewardsStore({ rewards, currentUser, redeemReward }: RewardsStoreProps) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case "Clock": return Clock;
      case "Coffee": return Coffee;
      case "Sun": return Sun;
      case "Sparkles": return Sparkles;
      default: return Calendar;
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "productivity": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "fun": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default: return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const handleRedeemClick = async (reward: Reward) => {
    if (currentUser.coins < reward.coinCost) return;

    setRedeemingId(reward.id);
    try {
      await redeemReward(reward.id);
      setSuccessId(reward.id);
      setTimeout(() => {
        setSuccessId(null);
      }, 2500);
    } catch (err: any) {
      alert(err.message || "Failed to redeem reward.");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Coins Banner */}
      <div className="bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 p-6 rounded-2xl border border-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider block">Execution Coins Bank</span>
          <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400/20 animate-bounce" />
            {currentUser.coins} coins Available
          </h2>
          <p className="text-xs text-slate-400">Complete missions to accumulate Execution Coins. Spend them on strategic buffers & fun break multipliers.</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-300 font-semibold font-mono">You are Level {currentUser.level} Officer</span>
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map(reward => {
          const Icon = getRewardIcon(reward.iconName);
          const isAffordable = currentUser.coins >= reward.coinCost;
          const isRedeeming = redeemingId === reward.id;
          const isSuccess = successId === reward.id;

          return (
            <div 
              key={reward.id}
              className={`bg-slate-900/60 p-5 rounded-2xl border flex flex-col justify-between gap-4 shadow-lg transition-all duration-300 ${
                isSuccess 
                  ? "border-emerald-500/40 bg-emerald-950/5 shadow-emerald-500/5" 
                  : "border-slate-800 hover:border-slate-700 hover:shadow-xl"
              }`}
            >
              <div className="space-y-3">
                {/* Category & Cost Badge */}
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider font-mono border ${getCategoryBadgeColor(reward.category)}`}>
                    {reward.category}
                  </span>
                  <div className="flex items-center space-x-1 font-mono font-bold text-amber-400 text-xs bg-slate-950/60 py-1 px-2.5 rounded-lg border border-slate-800">
                    <Zap className="w-3.5 h-3.5 fill-amber-400/10" />
                    <span>{reward.coinCost} coins</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl self-start shrink-0 ${
                    isSuccess 
                      ? "bg-emerald-500/10 text-emerald-400" 
                      : "bg-slate-800 text-slate-300"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm font-bold text-slate-100 truncate">{reward.title}</h3>
                    <p className="text-xs text-slate-400 leading-normal">{reward.description}</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={!isAffordable || isRedeeming}
                onClick={() => handleRedeemClick(reward)}
                className={`w-full py-2 px-4 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  isSuccess 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isAffordable 
                      ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-transparent hover:shadow-lg shadow-red-500/5" 
                      : "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
                }`}
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redeeming Block...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Redeemed Successfully!</span>
                  </>
                ) : (
                  <span>Redeem Voucher</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
