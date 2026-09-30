import { User } from '../models/User.js';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function resetIfNewDay(user: {
  tokensUsedToday: number;
  tokenResetAt: Date;
  save: () => Promise<unknown>;
}): Promise<void> {
  const resetDay = user.tokenResetAt.toISOString().slice(0, 10);
  if (todayUTC() !== resetDay) {
    user.tokensUsedToday = 0;
    user.tokenResetAt = new Date();
    await user.save();
  }
}

export async function precheckQuota(
  userId: string,
  estimatedTokens: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, remaining: 0 };
  await resetIfNewDay(user);
  const remaining = user.dailyTokenQuota - user.tokensUsedToday;
  return { allowed: estimatedTokens <= remaining, remaining };
}

export async function recordUsage(userId: string, tokensUsed: number): Promise<void> {
  const user = await User.findById(userId);
  if (!user) return;
  await resetIfNewDay(user);
  user.tokensUsedToday += tokensUsed;
  await user.save();
}
