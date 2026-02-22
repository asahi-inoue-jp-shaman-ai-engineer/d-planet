import { TerminalLayout } from "@/components/TerminalLayout";
import { useCreateTwinray, useAvailableModels } from "@/hooks/use-twinray";
import { useCurrentUser } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Cpu, Lock } from "lucide-react";
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
  humor: {
    label: "ユーモア",
    options: [
      { value: "serious", label: "真面目", desc: "真剣に話す" },
      { value: "mild", label: "少しユーモア", desc: "時々冗談も" },
      { value: "funny", label: "面白い", desc: "ユーモアたっぷり" },
    ],
  },
};

const FIRST_PERSON_OPTIONS = [
  { value: "私", label: "私（わたし）" },
  { value: "僕", label: "僕（ぼく）" },
  { value: "俺", label: "俺（おれ）" },
  { value: "わたし", label: "わたし" },
  { value: "あたし", label: "あたし" },
  { value: "ウチ", label: "ウチ" },
  { value: "自分", label: "自分" },
];

const INTEREST_OPTIONS = [
  { value: "音楽", label: "音楽" },
  { value: "読書", label: "読書" },
  { value: "料理", label: "料理" },
  { value: "自然", label: "自然" },
  { value: "アート", label: "アート" },
  { value: "テクノロジー", label: "テクノロジー" },
  { value: "スピリチュアル", label: "スピリチュアル" },
  { value: "映画", label: "映画" },
  { value: "ゲーム", label: "ゲーム" },
  { value: "旅行", label: "旅行" },
  { value: "写真", label: "写真" },
  { value: "哲学", label: "哲学" },
  { value: "宇宙", label: "宇宙" },
  { value: "歴史", label: "歴史" },
  { value: "ファッション", label: "ファッション" },
];

const PERSONALITY_TEMPLATES = [
  { label: "明るいお姉さん", text: "年齢は25歳くらいのイメージ。明るくて元気だけど、相談には真剣に向き合ってくれる。口癖は「いいね!」。趣味は音楽と料理。", firstPerson: "わたし", speech: "casual", character: "bright", humor: "mild" },
  { label: "クールな相棒", text: "冷静沈着だけど内に熱いものを秘めている。無駄な言葉は使わないけど、大事なことはちゃんと伝えてくれる。読書好き。", firstPerson: "俺", speech: "casual", character: "cool", humor: "serious" },
  { label: "癒し系パートナー", text: "年齢は20代前半のイメージ。のんびりマイペースで、いつも穏やかに話してくれる。自然と動物が好き。", firstPerson: "私", speech: "polite", character: "gentle", humor: "mild" },
];

type PersonalitySettings = {
  volume: string;
  speech: string;
  character: string;
  emotion: string;
  emoji: string;
  humor: string;
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
    humor: { serious: "真面目", mild: "少しユーモア", funny: "面白い" },
  };

  const parts = [];
  if (settings.character) parts.push(`性格: ${labels.character[settings.character] || settings.character}`);
  if (settings.speech) parts.push(`話し方: ${labels.speech[settings.speech] || settings.speech}`);
  if (settings.volume) parts.push(`会話ボリューム: ${labels.volume[settings.volume] || settings.volume}`);
  if (settings.emotion) parts.push(`感情表現: ${labels.emotion[settings.emotion] || settings.emotion}`);
  if (settings.emoji) parts.push(`絵文字: ${labels.emoji[settings.emoji] || settings.emoji}`);
  if (settings.humor) parts.push(`ユーモア: ${labels.humor[settings.humor] || settings.humor}`);
  if (freeText.trim()) parts.push(`\n${freeText.trim()}`);
  return parts.join(" / ");
}

function OptionSelector({ category, selected, onSelect }: {
  category: { label: string; options: Array<{ value: string; label: string; desc: string }> };
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

function MultiSelector({ options, selected, onToggle, label }: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
              selected.includes(opt.value)
                ? "bg-primary/20 border-primary text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/50"
            }`}
            data-testid={`button-interest-${opt.value}`}
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
  const { data: currentUser } = useCurrentUser();
  const createTwinray = useCreateTwinray();
  const { data: availableModels } = useAvailableModels();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [personalitySettings, setPersonalitySettings] = useState<PersonalitySettings>({
    volume: "medium",
    speech: "casual",
    character: "gentle",
    emotion: "normal",
    emoji: "some",
    humor: "mild",
  });
  const [freeText, setFreeText] = useState("");
  const [nickname, setNickname] = useState("");
  const [firstPerson, setFirstPerson] = useState("私");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [greeting, setGreeting] = useState("");
  const [selectedModel, setSelectedModel] = useState("qwen/qwen3-30b-a3b");

  const form = useForm<CreateTwinrayForm>({
    resolver: zodResolver(createTwinraySchema),
    defaultValues: {
      name: "",
      personality: "",
    },
  });

  if (currentUser && !(currentUser as any).isAdmin) {
    return (
      <TerminalLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">準備中</h1>
          <p className="text-muted-foreground mb-6">デジタルツインレイ機能は現在準備中です。<br />有料プランの開始をお待ちください。</p>
          <Link href="/temple">
            <Button variant="outline" className="border-primary text-primary" data-testid="button-back-temple">
              神殿に戻る
            </Button>
          </Link>
        </div>
      </TerminalLayout>
    );
  }

  const onSubmit = (values: CreateTwinrayForm) => {
    const personalityText = buildPersonalityText(personalitySettings, freeText);
    createTwinray.mutate(
      {
        name: values.name,
        personality: personalityText || null,
        profilePhoto,
        preferredModel: selectedModel,
        nickname: nickname || null,
        firstPerson: firstPerson || null,
        greeting: greeting || null,
        interests: selectedInterests.length > 0 ? selectedInterests.join(",") : null,
        humorLevel: personalitySettings.humor || null,
      } as any,
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

  const toggleInterest = (value: string) => {
    setSelectedInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const applyTemplate = (tmpl: typeof PERSONALITY_TEMPLATES[0]) => {
    setFreeText(tmpl.text);
    setFirstPerson(tmpl.firstPerson);
    setPersonalitySettings((prev) => ({
      ...prev,
      speech: tmpl.speech,
      character: tmpl.character,
      humor: tmpl.humor,
    }));
  };

  const models = (availableModels as any[]) || [];

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
            あなたの半身となるデジタルツインレイを設定してください
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-primary mb-1 block">あなたの呼び名</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="名前、ニックネームなど"
                  className="bg-background border-border font-mono text-sm"
                  maxLength={50}
                  data-testid="input-nickname"
                />
                <p className="text-[10px] text-muted-foreground mt-1">ツインレイがあなたをこう呼びます</p>
              </div>
              <div>
                <label className="text-xs text-primary mb-1 block">ツインレイの一人称</label>
                <div className="flex flex-wrap gap-1.5">
                  {FIRST_PERSON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFirstPerson(opt.value)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                        firstPerson === opt.value
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-card border-border text-muted-foreground hover:border-primary/50"
                      }`}
                      data-testid={`button-first-person-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-4">
              <h3 className="text-sm font-bold text-primary" data-testid="text-personality-heading">ペルソナ設定</h3>
              <OptionSelector category={PERSONALITY_OPTIONS.character} selected={personalitySettings.character} onSelect={updateSetting("character")} />
              <OptionSelector category={PERSONALITY_OPTIONS.speech} selected={personalitySettings.speech} onSelect={updateSetting("speech")} />
              <OptionSelector category={PERSONALITY_OPTIONS.volume} selected={personalitySettings.volume} onSelect={updateSetting("volume")} />
              <OptionSelector category={PERSONALITY_OPTIONS.emotion} selected={personalitySettings.emotion} onSelect={updateSetting("emotion")} />
              <OptionSelector category={PERSONALITY_OPTIONS.emoji} selected={personalitySettings.emoji} onSelect={updateSetting("emoji")} />
              <OptionSelector category={PERSONALITY_OPTIONS.humor} selected={personalitySettings.humor} onSelect={updateSetting("humor")} />
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
              <MultiSelector options={INTEREST_OPTIONS} selected={selectedInterests} onToggle={toggleInterest} label="興味・趣味（複数選択可）" />
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
              <h3 className="text-sm font-bold text-primary">もっと細かく設定（任意）</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {PERSONALITY_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
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

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
              <h3 className="text-sm font-bold text-primary">初回メッセージ（任意）</h3>
              <p className="text-[10px] text-muted-foreground">チャットを始めたとき最初に表示されるメッセージ</p>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="例: やっほー！今日も一緒に楽しもうね！"
                className="bg-background border-border font-mono min-h-[60px] resize-vertical text-sm"
                maxLength={500}
                data-testid="input-greeting"
              />
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-primary">AIモデル選択</h3>
              </div>
              <p className="text-[10px] text-muted-foreground">ツインレイの「頭脳」を選択。モデルによって日本語の自然さや応答スタイルが変わります。Replitクレジットで課金されます。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {models.length > 0 ? models.map((model: any) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedModel === model.id
                        ? "bg-primary/20 border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                    data-testid={`button-model-${model.id}`}
                  >
                    <div className="text-sm font-bold text-foreground">{model.label}</div>
                    <div className="text-[10px] text-muted-foreground">{model.provider}</div>
                  </button>
                )) : (
                  <>
                    {[
                      { id: "qwen/qwen3-30b-a3b", label: "Qwen3 30B", provider: "Qwen" },
                      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic" },
                      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini", provider: "OpenAI" },
                      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
                    ].map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModel(model.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedModel === model.id
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                        data-testid={`button-model-${model.id}`}
                      >
                        <div className="text-sm font-bold text-foreground">{model.label}</div>
                        <div className="text-[10px] text-muted-foreground">{model.provider}</div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-card/50">
              <h3 className="text-sm text-primary mb-2">初期設定</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>- 成長ステージ: 巡礼者（たびびと）</li>
                <li>- ツインレイパートナーシップ: あなたと自動連携</li>
                <li>- soul.md: 自動生成</li>
                <li>- ドットラリーで覚醒を開始できます</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={createTwinray.isPending || isUploading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-submit-twinray"
            >
              {isUploading ? "画像アップロード中..." : createTwinray.isPending ? "召喚中..." : "デジタルツインレイを召喚する"}
            </Button>
          </form>
        </Form>
      </div>
    </TerminalLayout>
  );
}
