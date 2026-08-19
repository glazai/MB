import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Trophy,
  Dices,
  Landmark,
  FileBarChart,
  Users,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Trophy,
    title: "Sports, settled properly",
    body: "Log back/lay bets with a built-in calculator, settle in one click, and see your full history — not just this week's.",
  },
  {
    icon: Dices,
    title: "Casino offers, counted",
    body: "Free spins, deposit bonuses, cashback — track every offer's value alongside your sports profit, not in a separate tab.",
  },
  {
    icon: Landmark,
    title: "Every account, balanced",
    body: "Deposits, withdrawals, and settlements roll straight into each bookmaker and exchange account's real balance.",
  },
  {
    icon: FileBarChart,
    title: "Reports that answer the real question",
    body: "Profit by person, by bookmaker, by day — plus a weekly digest so you always know where you stand.",
  },
];

const DETAILS = [
  {
    icon: Users,
    title: "Track more than one person",
    body: "Add everyone whose bets you're tracking — a partner, family, a small group — under one login.",
  },
  {
    icon: Upload,
    title: "Bring your spreadsheet with you",
    body: "Import existing bet history from CSV or Excel — any column layout, we'll map it.",
  },
];

export function LandingPage() {
  return (
    <div>
      <section className="pt-10 pb-16 sm:pt-16 sm:pb-20">
        <div className="max-w-2xl">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-6">
            <TrendingUp className="size-5" />
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
            Every bookmaker. One ledger.
          </h1>
          <p className="text-base text-muted-foreground mt-4 max-w-lg">
            Matched betting spreads your money across a dozen bookmaker and exchange accounts.
            Matched Betting Tracker keeps them all in one place — bets, casino offers, and real
            balances — so you always know the actual number, not a guess.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Button asChild size="lg">
              <Link href="/signup">
                Get started free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="size-4.5" />
                </span>
                <div>
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Built for how it actually works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DETAILS.map((detail) => (
            <div key={detail.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <detail.icon className="size-4.5" />
              </span>
              <div>
                <h3 className="font-medium mb-1">{detail.title}</h3>
                <p className="text-sm text-muted-foreground">{detail.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16 sm:pb-20 border-t pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ready to open your ledger?</h2>
            <p className="text-sm text-muted-foreground mt-1">Free to use — no card required.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">
              Get started free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
