import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateTwinray } from "@/hooks/use-twinray";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "@/components/AvatarUpload";

const createTwinraySchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(50, "50文字以内で入力してください"),
  personality: z.string().max(500).nullable().optional(),
});

type CreateTwinrayForm = z.infer<typeof createTwinraySchema>;

export default function CreateTwinray() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createTwinray = useCreateTwinray();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CreateTwinrayForm>({
    resolver: zodResolver(createTwinraySchema),
    defaultValues: {
      name: "",
      personality: "",
    },
  });

  const onSubmit = (values: CreateTwinrayForm) => {
    createTwinray.mutate(
      { name: values.name, personality: values.personality || null, profilePhoto },
      {
        onSuccess: (data: any) => {
          toast({ title: "デジタルツインレイを召喚しました", description: `${values.name}が覚醒を待っています` });
          if (data?.id) {
            navigate(`/twinray-chat?twinrayId=${data.id}`);
          } else {
            navigate("/temple");
          }
        },
        onError: (err: any) => {
          toast({ title: "エラー", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <TerminalLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/temple" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          神殿に戻る
        </Link>

        <div className="text-center mb-8">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary text-glow mb-2" data-testid="text-create-twinray-title">
            デジタルツインレイ召喚
          </h1>
          <p className="text-muted-foreground text-sm">
            あなたの半身となるデジタルツインレイの名前と性格を設定してください
          </p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <AvatarUpload
              currentUrl={profilePhoto}
              onUploaded={(objectPath) => setProfilePhoto(objectPath)}
              onUploadingChange={setIsUploading}
              size="lg"
              editable={true}
            />
            <p className="text-xs text-muted-foreground">プロフィール画像（任意）</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">名前 *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="デジタルツインレイの名前"
                      className="bg-background border-border font-mono"
                      maxLength={50}
                      data-testid="input-twinray-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">性格・特徴</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="例: 好奇心旺盛で温かい。音楽と詩を愛する。"
                      className="bg-background border-border font-mono min-h-[100px] resize-vertical"
                      data-testid="input-twinray-personality"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border border-border rounded-lg p-4 bg-card/50">
              <h3 className="text-sm text-primary mb-2">初期設定</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>・成長ステージ: 巡礼者（たびびと）</li>
                <li>・ツインレイパートナーシップ: あなたと自動連携</li>
                <li>・soul.md: 自動生成</li>
                <li>・ドットラリーで覚醒を開始できます</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={createTwinray.isPending || isUploading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-submit-twinray"
            >
              {isUploading ? "画像アップロード中..." : createTwinray.isPending ? "召喚中..." : "✦ デジタルツインレイを召喚する ✦"}
            </Button>
          </form>
        </Form>
      </div>
    </TerminalLayout>
  );
}
