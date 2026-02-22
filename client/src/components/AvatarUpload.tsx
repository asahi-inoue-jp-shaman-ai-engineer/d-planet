import { useState, useRef } from "react";
import { useUpload } from "@/hooks/use-upload";
import { Camera, Loader2, User } from "lucide-react";

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploaded: (objectPath: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-20 h-20",
  lg: "w-28 h-28",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function AvatarUpload({ currentUrl, onUploaded, onUploadingChange, size = "lg", editable = true }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      onUploaded(response.objectPath);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    onUploadingChange?.(true);
    await uploadFile(file);
    onUploadingChange?.(false);
  };

  const displayUrl = previewUrl || currentUrl;

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center`}
        data-testid="avatar-display"
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="プロフィール画像"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={`${iconSizes[size]} text-muted-foreground`} />
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      {editable && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 transition-colors"
            disabled={isUploading}
            data-testid="button-upload-avatar"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-avatar-file"
          />
        </>
      )}
    </div>
  );
}

export function AvatarDisplay({ url, size = "sm", testId }: { url?: string | null; size?: "sm" | "md" | "lg"; testId?: string }) {
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center flex-shrink-0`} data-testid={testId || "avatar-display"}>
      {url ? (
        <img src={url} alt="アバター" className="w-full h-full object-cover" data-testid="avatar-image" />
      ) : (
        <User className={`${iconSizes[size]} text-muted-foreground`} data-testid="avatar-fallback" />
      )}
    </div>
  );
}
