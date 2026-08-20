import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BookmarkCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function SavedJobs() {
  const [, setLocation] = useLocation(); const saved = trpc.jobs.saved.useQuery();
  if (saved.isError) return <div className="rounded-3xl border border-[#f0d5d1] bg-white p-8 text-center"><h2 className="font-extrabold text-[#8d4e47]">Saved roles could not be loaded.</h2><p className="mt-2 text-sm text-[#74869a]">Please try again in a moment.</p><Button variant="outline" className="mt-5 rounded-xl" onClick={() => saved.refetch()}>Try again</Button></div>;
  return <div className="space-y-6"><div><p className="eyebrow text-[#27806f]">Return with intention</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.05em] text-[#15365c] sm:text-4xl">Saved opportunities.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a7d92]">Keep roles you want to consider in one private list. Removing a bookmark updates this view immediately.</p></div>{saved.isLoading ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div className="h-64 animate-pulse rounded-2xl bg-white" key={index} />)}</div> : saved.data?.length ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{saved.data.map(job => <JobCard job={job} key={job.id} />)}</div> : <div className="rounded-3xl border border-dashed border-[#cedce8] bg-white px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eef5fc] text-[#3c75a9]"><BookmarkCheck className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-extrabold tracking-[-.035em] text-[#294864]">Nothing saved yet.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718398]">Save roles you’re interested in and they’ll appear here for a focused return later.</p><Button variant="outline" className="mt-5 rounded-xl border-[#d2dfe9] font-bold text-[#396788]" onClick={() => setLocation("/jobs")}>Explore jobs</Button></div>}</div>;
}
