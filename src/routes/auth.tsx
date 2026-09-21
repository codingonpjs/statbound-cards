import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import tavernBg from "@/assets/tavern-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Enter the Tavern — Tavern Brawl" },
      {
        name: "description",
        content:
          "Sign in or create a brawler to train stats, run jobs and fight card duels in Tavern Brawl.",
      },
      { property: "og:title", content: "Enter the Tavern — Tavern Brawl" },
      {
        property: "og:description",
        content: "Sign in to your brawler and take a seat at the card table.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/tavern", replace: true });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/tavern`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to the tavern — your brawler is ready.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      void navigate({ to: "/tavern", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <img
        src={tavernBg}
        alt=""
        width={1536}
        height={1024}
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-40"
      />
      <div className="pointer-events-none absolute inset-0 bg-background/70" />

      <div className="panel relative w-full max-w-md p-7">
        <h1 className="font-display text-3xl font-bold text-gradient-gold">Tavern Brawl</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Train your body, run the streets, and settle scores at the card table.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Brawler name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hark the Quiet"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signin" ? "Take a seat" : "Create brawler"}
          </Button>
        </form>

        <Button variant="outline" onClick={google} disabled={busy} className="mt-3 w-full">
          Continue with Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:text-gold hover:underline"
        >
          {mode === "signin"
            ? "New here? Create a brawler"
            : "Already have a brawler? Sign in"}
        </button>
      </div>
    </div>
  );
}
