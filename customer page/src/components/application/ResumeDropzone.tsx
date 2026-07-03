import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

interface ResumeDropzoneProps {
  onComplete: (file: File) => void;
  state: UploadState;
  progress: number;
  file: File | null;
  onRemove: () => void;
  disabled?: boolean;
}

export function ResumeDropzone({
  onComplete,
  state,
  progress,
  file,
  onRemove,
  disabled = false,
}: ResumeDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        if (code === "file-too-large") setError("File is too large. Max size is 10 MB.");
        else if (code === "file-invalid-type") setError("Please upload a PDF file.");
        else setError("That file couldn't be uploaded. Please try another.");
        return;
      }
      if (accepted[0]) onComplete(accepted[0]);
    },
    [onComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
    },
    disabled: disabled || state !== "idle",
  });

  if (file && state !== "idle") {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-khalti">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              {(state === "done" || state === "error") ? (
                <button
                  onClick={onRemove}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {state === "uploading" && (
              <div className="mt-3">
                <Progress value={progress} className="h-1.5" />
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading {progress}%
                </div>
              </div>
            )}
            {state === "processing" && (
              <div className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
                <Loader2 className="h-4 w-4 animate-spin text-khalti" />
                Preparing your application...
              </div>
            )}
            {state === "done" && (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[oklch(0.55_0.16_155)]">
                <CheckCircle2 className="h-4 w-4" />
                Upload complete — review your information below.
              </div>
            )}
            {state === "error" && (
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[oklch(0.62_0.24_27)]">
                <AlertCircle className="h-4 w-4" />
                We couldn't read this resume. Remove it and try again, or fill out the form manually below.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-10 text-center transition-all
          ${disabled ? "opacity-55 cursor-not-allowed border-border" : "cursor-pointer hover:border-khalti/50 hover:bg-secondary/40"}
          ${isDragActive && !disabled ? "border-khalti bg-khalti/5" : "border-border"}`}
      >
        <input {...getInputProps()} />
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-khalti">
          <UploadCloud className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {isDragActive ? "Drop your resume here" : "Upload your resume"}
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          We'll use it to pre-fill the rest of your application so you don't have to retype things.
        </p>
        <Button type="button" disabled={disabled} className="mt-5 bg-khalti text-khalti-foreground hover:bg-khalti/90">
          Choose file
        </Button>
        <div className="mt-3 text-xs text-muted-foreground">
          PDF • up to 10 MB
        </div>
      </div>
      {error && (
        <div className="mt-3 rounded-xl border border-[oklch(0.62_0.24_27)]/30 bg-[oklch(0.62_0.24_27)]/5 px-4 py-3 text-sm text-[oklch(0.62_0.24_27)]">
          {error}
        </div>
      )}
    </div>
  );
}
