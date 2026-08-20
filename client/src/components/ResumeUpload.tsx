import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileCheck2, FileWarning, FileUp, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function toBase64(file: File, onProgress: (percent: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.onprogress = event => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function ResumeUpload({ onProcessed }: { onProcessed?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "processing" | "failed">("idle");
  const [readProgress, setReadProgress] = useState(0);
  const upload = trpc.profile.uploadResume.useMutation({
    onSuccess: data => { setStage("idle"); toast.success(data.duplicate ? "This exact resume is already on your profile." : "Resume processed. Review the extracted profile details before confirming them."); onProcessed?.(); },
    onError: error => { setStage("failed"); toast.error(error.message); },
  });
  const selectFile = async (file?: File) => {
    if (!file) return;
    const extension = file.name.toLowerCase().split(".").pop();
    const inferredType = extension === "pdf" ? "application/pdf" : extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : null;
    const accepted = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!inferredType || (file.type && !accepted.includes(file.type))) { toast.error("Choose a PDF or DOCX resume whose file type matches its extension."); return; }
    if (!file.size) { toast.error("This file is empty. Choose a resume with readable content."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Resume files must be 5 MB or smaller."); return; }
    setFileName(file.name);
    setLastFile(file); setReadProgress(0);
    setStage("reading");
    try { const base64 = await toBase64(file, setReadProgress); setReadProgress(100); setStage("processing"); await upload.mutateAsync({ name: file.name, mimeType: inferredType, base64 }); } catch { /* mutation callback provides the message */ }
  };
  const busy = stage === "reading" || stage === "processing" || upload.isPending;
  const status = stage === "reading" ? `Reading your file… ${readProgress}%` : stage === "processing" ? "Uploaded. Analyzing securely on the server…" : stage === "failed" ? "We could not process this document." : fileName ? fileName : "Add a current resume";
  return <div className="rounded-2xl border border-dashed border-[#c8d8e7] bg-[#fbfdff] p-5 sm:p-6"><input ref={inputRef} className="hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => selectFile(event.target.files?.[0])} /><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${stage === "failed" ? "bg-[#fdf0ef] text-[#b95b51]" : "bg-[#eaf4f0] text-[#227464]"}`}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : stage === "failed" ? <FileWarning className="h-5 w-5" /> : fileName ? <FileCheck2 className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}</div><div className="flex-1"><p className="font-extrabold tracking-[-.025em] text-[#254463]" aria-live="polite">{status}</p>{stage === "reading" && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6edf3]" aria-label={`File read progress: ${readProgress}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readProgress}><div className="h-full rounded-full bg-[#4aa58c] transition-[width] duration-150" style={{ width: `${readProgress}%` }} /></div>}{stage === "processing" && <p className="mt-2 text-xs font-semibold text-[#2f7c6c]" aria-live="polite">Processing time depends on the document; no estimated completion time is shown.</p>}<p className="mt-1 text-sm leading-6 text-[#74869a]">PDF or DOCX, up to 5 MB. File type, extension, and readable content are checked before secure server processing.</p><p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#55758a]"><ShieldCheck className="h-3.5 w-3.5 text-[#2c9179]" /> Used only to populate your profile for review.</p></div>{stage === "failed" && lastFile ? <Button variant="outline" className="pressable rounded-xl border-[#e1c3be] bg-white font-bold text-[#9f534a]" disabled={busy} onClick={() => selectFile(lastFile)}><RotateCcw className="mr-2 h-4 w-4" />Retry</Button> : <Button variant="outline" className="pressable rounded-xl border-[#c7d6e4] bg-white font-bold text-[#2b5e83]" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Processing" : fileName ? "Replace" : "Upload"}</Button>}</div></div>;
}
