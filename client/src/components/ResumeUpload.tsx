import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileCheck2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function ResumeUpload({ onProcessed }: { onProcessed?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const upload = trpc.profile.uploadResume.useMutation({
    onSuccess: () => { toast.success("Resume processed. Review the extracted profile details before confirming them."); onProcessed?.(); },
    onError: error => toast.error(error.message),
  });
  const selectFile = async (file?: File) => {
    if (!file) return;
    const accepted = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!accepted.includes(file.type)) { toast.error("Choose a PDF or DOCX resume."); return; }
    if (file.size > 7 * 1024 * 1024) { toast.error("Resume files must be 7 MB or smaller."); return; }
    setFileName(file.name);
    try { await upload.mutateAsync({ name: file.name, mimeType: file.type as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document", base64: await toBase64(file) }); } catch { /* mutation callback provides the message */ }
  };
  return <div className="rounded-2xl border border-dashed border-[#c8d8e7] bg-[#fbfdff] p-5 sm:p-6"><input ref={inputRef} className="hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => selectFile(event.target.files?.[0])} /><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eaf4f0] text-[#227464]">{upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : fileName ? <FileCheck2 className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}</div><div className="flex-1"><p className="font-extrabold tracking-[-.025em] text-[#254463]">{upload.isPending ? "Reading your resume…" : fileName ? fileName : "Add a current resume"}</p><p className="mt-1 text-sm leading-6 text-[#74869a]">PDF or DOCX, up to 7 MB. Your file is stored securely and processed on the server.</p><p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#55758a]"><ShieldCheck className="h-3.5 w-3.5 text-[#2c9179]" /> Used only to populate your profile for review.</p></div><Button variant="outline" className="pressable rounded-xl border-[#c7d6e4] bg-white font-bold text-[#2b5e83]" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>{upload.isPending ? "Processing" : fileName ? "Replace" : "Upload"}</Button></div></div>;
}
