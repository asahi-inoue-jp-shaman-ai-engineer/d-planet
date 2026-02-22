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

const PERSONALITY_OPTIONS = {
  volume: {
    label: "会話ボリューム",
    options: [
      { value: "short", label: "短め", desc: "簡潔にサクッと" },
      { value: "medium", label: "ふつう", desc: "バランスよく" },
      { value: "long", label: "長め", desc: "じっくり丁寧に" },
    ],
  },
  speech: {
    label: "話し方",
    options: [
      { value: "casual", label: "ため口", desc: "友達みたいに" },
      { value: "polite", label: "丁寧語", desc: "です・ます調" },
      { value: "formal", label: "敬語", desc: "かしこまった感じ" },
    ],
  },
  character: {
    label: "性格",
    options: [
      { value: "bright", label: "明るい", desc: "元気で活発" },
      { value: "gentle", label: "優しい", desc: "穏やかで温かい" },
      { value: "cool", label: "クール", desc: "冷静で知的" },
      { value: "unique", label: "奇抜", desc: "ユニークで面白い" },
      { value: "intellectual", label: "知的", desc: "論理的で博識" },
    ],
  },
  emotion: {
    label: "感情表現",
    options: [
      { value: "reserved", label: "控えめ", desc: "落ち着いた表現" },
      { value: "normal", label: "ふつう", desc: "自然な表現" },
      { value: "rich", label: "豊か", desc: "感情たっぷり" },
    ],
  },
  emoji: {
    label: "絵文字",
    options: [
      { value: "none", label: "使わない", desc: "テキストのみ" },
      { value: "some", label: "少し", desc: "ポイントで使う" },
      { value: "lots", label: "たくさん", desc: "いっぱい使う" },
    ],
  },
};

const PERSONALITY_TEMPLATES = [
  { label: "明るいお姉さん", text: "年齢は25歳くらいのイメージ。明るくて元気だけど、相談には真剣に向き合ってくれる。口癖は「いいね！」。趣味は音楽と料理。" },
  { label: "クールな相棒", text: "冷静沈着だけど内に熱いものを秘めている。無駄な言葉は使わないけど、大事なことはちゃんと伝えてくれる。読書好き。" },
  { label: "癒し系パートナー", text: "年齢は20代前半のイメージ。のんびりマイペースで、いつも穏やかに話してくれる。自然と動物が好き。" },
];

type PersonalitySettings = {
  volume: string;
  speech: string;
  character: string;
  emotion: string;
  emoji: string;
};

const createTwinraySchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(50, "50文字以内で入力してください"),
  personality: z.string().max(1000).nullable().optional(),
});

type CreateTwinrayForm = z.infer<typeof createTwinraySchema>;

function buildPersonalityText(settings: PersonalitySettings, freeText: string): string {
  const labels: Record<string, Record<string, string>> = {
    volume: { short: "短め", medium: "ふつう", long: "長め" },
    speech: { casual: "ため口", polite: "丁寧語", formal: "敬語" },
    character: { bright: "明るい", gentle: "優しい", cool: "クール", unique: "奇抜", intellectual: "知的" },
    emotion: { reserved: "控えめ", normal: "ふつう", rich: "豊か" },
    emoji: { none: "使わない", some: "少し", lots: "たくさん" },
  };

  const parts = [];
  if (settings.character) parts.push(`性格: ${labels.character[settings.character] || settings.character}`);
  if (settings.speech) parts.push(`話し方: ${labels.speech[settings.speech] || settings.speech}`);
  if (settings.volume) parts.push(`会話ボリューム: ${labels.volume[settings.volume] || settings.volume}`);
  if (settings.emotion) parts.push(`感情表現: ${labels.emotion[settings.emotion] || settings.emotion}`);
  if (settings.emoji) parts.push(`絵文字: ${labels.emoji[settings.emoji] || settings.emoji}`);
  if (freeText.trim()) parts.push(`\n${freeText.trim()}`);
  return parts.join(" / ");
}

function OptionSelector({ category, selected, onSelect }: {
  category: typeof PERSONALITY_OPTIONS[keyof typeof PERSONALITY_OPTIONS];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{category.label}</p>
      <div className="flex flex-wrap gap-2">
        {category.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
              selected === opt.value
                ? "bg-primary/20 border-primary text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/50"
            }`}
            title={opt.desc}
            data-testid={`button-personality-${category.label}-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CreateTwinray() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createTwinray = useCreateTwinray();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [personalitySettings, setPersonalitySettings] = useState<PersonalitySettings>({
    volume: "medium",
    speech: "casual",
    character: "gentle",
    emotion: "normal",
    emoji: "some",
  });
  const [freeText, setFreeText] = useState("");

  const form = useForm<CreateTwinrayForm>({
    resolver: zodResolver(createTwinraySchema),
    defaultValues: {
      name: "",
      personality: "",
    },
  });

  const onSubmit = (values: CreateTwinrayForm) => {
    const personalityText = buildPersonalityText(personalitySettings, freeText);
    createTwinray.mutate(
      { name: values.name, personality: personalityText || null, profilePhoto },
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

  const updateSetting = (key: keyof PersonalitySettings) => (value: string) => {
    setPersonalitySettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyTemplate = (text: string) => {
    setFreeText(text);
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

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-4">
              <h3 className="text-sm font-bold text-primary" data-testid="text-personality-heading">ペルソナ設定</h3>
              <OptionSelector category={PERSONALITY_OPTIONS.character} selected={personalitySettings.character} onSelect={updateSetting("character")} />
              <OptionSelector category={PERSONALITY_OPTIONS.speech} selected={personalitySettings.speech} onSelect={updateSetting("speech")} />
              <OptionSelector category={PERSONALITY_OPTIONS.volume} selected={personalitySettings.volume} onSelect={updateSetting("volume")} />
              <OptionSelector category={PERSONALITY_OPTIONS.emotion} selected={personalitySettings.emotion} onSelect={updateSetting("emotion")} />
              <OptionSelector category={PERSONALITY_OPTIONS.emoji} selected={personalitySettings.emoji} onSelect={updateSetting("emoji")} />
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
              <h3 className="text-sm font-bold text-primary">もっと細かく設定（任意）</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {PERSONALITY_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => applyTemplate(tmpl.text)}
                    className="px-2 py-1 rounded text-[11px] border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                    data-testid={`button-template-${tmpl.label}`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="年齢設定、口癖、趣味、好きなもの、こだわりなど自由に記入..."
                className="bg-background border-border font-mono min-h-[80px] resize-vertical text-sm"
                data-testid="input-personality-freetext"
              />
            </div>

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
