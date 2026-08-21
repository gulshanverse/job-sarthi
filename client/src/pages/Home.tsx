import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { goToLogin } from "@/const";
import { ArrowRight, Check, Compass, FileSearch, Menu, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const steps = [
  { number: "01", title: "Bring your story", text: "Upload your resume or add the experience, skills, and goals that matter to you." },
  { number: "02", title: "See the signal", text: "Your profile becomes a clear view of the roles, strengths, and preferences shaping your search." },
  { number: "03", title: "Act with clarity", text: "Explore relevant opportunities with an explanation of the fit and the next skill to strengthen." },
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfcfe] text-[#142846]">
      <section className="landing-grid relative overflow-hidden">
        <div className="soft-orb absolute -left-20 top-32 h-56 w-56 rounded-full bg-[#bfe9df]" />
        <div className="soft-orb absolute right-[-4rem] top-[-3rem] h-72 w-72 rounded-full bg-[#d8e8ff]" />
        <header className="relative z-10 mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-7">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex" aria-label="Primary navigation">
            <a className="nav-link" href="#how-it-works">How it works</a>
            <a className="nav-link" href="#why-job-sarthi">Why Job Sarthi</a>
            <Link className="nav-link" href="/jobs">Explore jobs</Link>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" className="font-bold text-[#24446f]" onClick={goToLogin}>Sign in</Button>
            <Button className="pressable rounded-xl bg-[#0d2c58] px-5 font-bold shadow-[0_10px_24px_-14px_rgba(13,44,88,.9)] hover:bg-[#12386d]" onClick={goToLogin}>
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(value => !value)} aria-label="Toggle navigation"><Menu className="h-5 w-5" /></Button>
        </header>
        {mobileOpen && <div className="relative z-20 mx-5 mb-4 rounded-2xl border border-[#dce6f3] bg-white p-4 surface-shadow md:hidden"><div className="grid gap-1 text-sm font-bold"><a className="rounded-lg px-3 py-2" href="#how-it-works">How it works</a><a className="rounded-lg px-3 py-2" href="#why-job-sarthi">Why Job Sarthi</a><button className="rounded-lg bg-[#edf4fb] px-3 py-2 text-left" onClick={goToLogin}>Sign in to continue</button></div></div>}
        <main className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 sm:px-7 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl drift-up">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfe3df] bg-white/75 px-3 py-1.5 text-xs font-bold text-[#276657] backdrop-blur"><Sparkles className="h-3.5 w-3.5" /> Career discovery, made personal</div>
            <h1 className="max-w-xl font-display text-[3.45rem] font-semibold leading-[.98] tracking-[-.065em] text-[#112b51] sm:text-[4.75rem]">Find the work that <em className="text-[#227a69]">fits.</em></h1>
            <p className="mt-7 max-w-xl text-[1.05rem] leading-8 text-[#50627c] sm:text-lg">Job Sarthi turns your experience, skills, and goals into a more focused job search—so every opportunity comes with a reason to explore it.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="pressable h-12 rounded-xl bg-[#0d2c58] px-6 text-[.95rem] font-bold hover:bg-[#12386d]" onClick={goToLogin}>Analyze my resume <ArrowRight className="ml-2 h-4 w-4" /></Button><Link href="/jobs"><Button size="lg" variant="outline" className="pressable h-12 w-full rounded-xl border-[#cbd9e9] bg-white px-6 font-bold text-[#23466e] hover:bg-[#f5f9fd] sm:w-auto">Explore jobs</Button></Link></div>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#63748a]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#e1f2ed] text-[#1f8069]"><Check className="h-3 w-3" /></span> Start with your real experience. Keep control of your profile.</p>
          </div>
          <div className="drift-up-delay relative mx-auto w-full max-w-[550px] lg:mr-0">
            <div className="rounded-[1.6rem] border border-[#dbe5f1] bg-white/95 p-3 surface-shadow backdrop-blur sm:p-5">
              <div className="rounded-[1.15rem] bg-[#092247] p-5 text-white sm:p-7">
                <div className="flex items-center justify-between"><div><p className="eyebrow text-[#99c9da]">Your career profile</p><p className="mt-2 text-xl font-bold tracking-[-.04em]">Signals, not guesses</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><FileSearch className="h-5 w-5 text-[#9de1cf]" /></div></div>
                <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white/10 p-3"><p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-[#9eb7d1]">Skills</p><p className="mt-2 text-sm font-bold">Your strengths</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-[#9eb7d1]">Goals</p><p className="mt-2 text-sm font-bold">Your direction</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-[#9eb7d1]">Roles</p><p className="mt-2 text-sm font-bold">Your fit</p></div></div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.1fr_.9fr]"><div className="rounded-[1rem] border border-[#e3ebf3] bg-[#fafcff] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#5b6d82]"><Target className="h-4 w-4 text-[#167564]" /> Match explanation</div><p className="mt-3 text-sm font-bold leading-6 text-[#1e3a60]">See which parts of your profile connect with each role.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5edf5]"><div className="h-full w-[76%] rounded-full bg-[#4db09a]" /></div></div><div className="rounded-[1rem] border border-[#e3ebf3] bg-white p-4"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#eff5ff] text-[#315f9a]"><Compass className="h-4 w-4" /></div><p className="mt-3 text-sm font-bold leading-6 text-[#1e3a60]">A useful next step, whenever you need one.</p></div></div>
            </div>
            <div className="float-card absolute -bottom-7 -left-3 hidden max-w-[228px] rounded-2xl border border-[#dce7ef] bg-white p-4 surface-shadow sm:block"><p className="eyebrow text-[#5d768f]">Thoughtful by design</p><p className="mt-2 text-sm font-bold leading-5 text-[#18365c]">Every recommendation explains its relevance.</p></div>
          </div>
        </main>
      </section>
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-7 sm:py-28"><div className="max-w-2xl"><p className="eyebrow text-[#1d7a69]">A more considered search</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.055em] text-[#112b51] sm:text-5xl">Career clarity begins with your own context.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{steps.map(step => <article key={step.number} className="rounded-2xl border border-[#e2e9f0] bg-white p-6 sm:p-7"><p className="font-display text-2xl italic text-[#77bcae]">{step.number}</p><h3 className="mt-8 text-lg font-extrabold tracking-[-.04em] text-[#18365c]">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[#66768b]">{step.text}</p></article>)}</div></section>
      <section id="why-job-sarthi" className="border-y border-[#e3e9f0] bg-[#f2f7fb]"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-7 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-28"><div><p className="eyebrow text-[#1d7a69]">Built for better decisions</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.055em] text-[#112b51]">A job search with context, not noise.</h2></div><div className="grid gap-7 sm:grid-cols-2"><div><p className="text-base font-extrabold text-[#1a3b63]">Profile-led relevance</p><p className="mt-2 text-sm leading-6 text-[#61758e]">Your skills, experience, role goals, and work preferences inform what you see.</p></div><div><p className="text-base font-extrabold text-[#1a3b63]">Explainable matching</p><p className="mt-2 text-sm leading-6 text-[#61758e]">Clear strengths and skill gaps help you decide where to invest your time.</p></div><div><p className="text-base font-extrabold text-[#1a3b63]">One calm workspace</p><p className="mt-2 text-sm leading-6 text-[#61758e]">Keep opportunities, applications, and career next steps together without the clutter.</p></div><div><p className="text-base font-extrabold text-[#1a3b63]">You remain in control</p><p className="mt-2 text-sm leading-6 text-[#61758e]">Review your extracted profile before it shapes the opportunities you receive.</p></div></div></div></section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-7 sm:py-28"><div className="rounded-[1.7rem] bg-[#0a284f] px-6 py-12 text-center text-white sm:px-12 sm:py-16"><p className="eyebrow text-[#9edacb]">Ready when you are</p><h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-semibold tracking-[-.055em] sm:text-5xl">A more intentional next move starts here.</h2><Button size="lg" className="pressable mt-8 rounded-xl bg-[#d9f2eb] px-6 font-bold text-[#174854] hover:bg-white" onClick={goToLogin}>Create your profile <ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>
      <footer className="border-t border-[#e3eaf1]"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#6a7a8f] sm:flex-row sm:items-center sm:justify-between sm:px-7"><BrandMark /><p>Job Sarthi helps you navigate your career with more context.</p></div></footer>
    </div>
  );
}
