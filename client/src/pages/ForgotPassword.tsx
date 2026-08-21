import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [devToken, setDevToken] = useState<string | null>(null); const request = trpc.auth.forgotPassword.useMutation({ onSuccess: value => { setMessage("If an account exists for this email, reset instructions are available."); setDevToken("developmentToken" in value ? value.developmentToken ?? null : null); } });
  return <main className="landing-grid grid min-h-screen place-items-center bg-[#f7faff] p-5"><section className="w-full max-w-md rounded-[1.75rem] border border-[#dbe6f1] bg-white p-7 surface-shadow sm:p-9"><Link href="/login" className="text-sm font-extrabold text-[#18446e]">← Back to sign in</Link><h1 className="mt-9 font-display text-4xl font-semibold tracking-[-.06em] text-[#112b51]">Reset your password.</h1><p className="mt-3 text-sm leading-6 text-[#66778b]">Enter your email. We will not reveal whether an account exists.</p><form className="mt-7 space-y-5" onSubmit={event => { event.preventDefault(); setMessage(""); request.mutate({ email }); }}><div className="space-y-2"><Label htmlFor="forgot-email">Email</Label><Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></div><Button className="h-11 w-full rounded-xl bg-[#0d2c58] font-bold hover:bg-[#12386d]" disabled={request.isPending}>{request.isPending ? "Sending…" : "Request reset"}</Button></form>{message && <p className="mt-5 rounded-xl bg-[#eff7f4] p-3 text-sm font-medium text-[#216b5d]">{message}</p>}{devToken && <Link className="mt-4 block text-sm font-bold text-[#216b89]" href={`/reset-password?token=${encodeURIComponent(devToken)}`}>Continue with the development reset link</Link>}<p className="mt-7 text-xs leading-5 text-[#7b8999]">Email delivery is unavailable until a Job Sarthi email sender is configured.</p></section></main>;
}
