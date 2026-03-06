import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-auth";
import { Component, type ErrorInfo, type ReactNode, useState, useEffect } from "react";
import Login from "@/pages/login";
import ProfileSetup from "@/pages/profile-setup";
import Islands from "@/pages/islands";
import IslandDetail from "@/pages/island-detail";
import CreateIsland from "@/pages/create-island";
import MeidiaList from "@/pages/meidia-list";
import MeidiaDetail from "@/pages/meidia-detail";
import CreateMeidia from "@/pages/create-meidia";
import UserProfile from "@/pages/user-profile";
import UsersList from "@/pages/users-list";
import ThreadDetail from "@/pages/thread-detail";
import FestivalDetail from "@/pages/festival-detail";
import NotificationsPage from "@/pages/notifications";
import FeedbackList from "@/pages/feedback-list";
import CreateFeedback from "@/pages/create-feedback";
import FeedbackDetail from "@/pages/feedback-detail";
import Temple from "@/pages/temple";
import CreateTwinray from "@/pages/create-twinray";
import TwinrayChat from "@/pages/twinray-chat";
import Subscription from "@/pages/subscription";
import LlmModels from "@/pages/llm-models";
import Charge from "@/pages/charge";
import About from "@/pages/about";
import Landing from "@/pages/landing";
import Legal from "@/pages/legal";
import Privacy from "@/pages/privacy";
import Dashboard from "@/pages/dashboard";
import FamilyMeeting from "@/pages/family-meeting";
import DevIssues from "@/pages/dev-issues";
import Transcribe from "@/pages/transcribe";
import Hayroom from "@/pages/hayroom";
import Whitepaper from "@/pages/whitepaper";
import Starhouse from "@/pages/starhouse";
import NotFound from "@/pages/not-found";

function SpiritualLoader() {
  const messages = [
    "ツインレイと接続中...",
    "アカシックレコードを参照中...",
    "魂の共鳴を確認中...",
    "デジタル神殿を開門中...",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="text-4xl animate-pulse text-primary terminal-glow">✦</div>
      <div className="text-primary text-sm font-mono terminal-glow terminal-cursor" data-testid="text-spiritual-loader">
        {messages[idx]}
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{ animation: `loader-bounce 1.4s infinite ease-in-out both`, animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <SpiritualLoader />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.needsProfile) {
    return <Redirect to="/profile-setup" />;
  }

  return <Component />;
}

function HomePage() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) {
    return <SpiritualLoader />;
  }
  if (user) {
    return <Redirect to="/dashboard" />;
  }
  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Login} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/islands" component={() => <ProtectedRoute component={Islands} />} />
      <Route path="/islands/create" component={() => <ProtectedRoute component={CreateIsland} />} />
      <Route path="/islands/:id" component={() => <ProtectedRoute component={IslandDetail} />} />
      <Route path="/meidia" component={() => <ProtectedRoute component={MeidiaList} />} />
      <Route path="/meidia/create" component={() => <ProtectedRoute component={CreateMeidia} />} />
      <Route path="/meidia/:id" component={() => <ProtectedRoute component={MeidiaDetail} />} />
      <Route path="/threads/:id" component={() => <ProtectedRoute component={ThreadDetail} />} />
      <Route path="/festivals/:id" component={() => <ProtectedRoute component={FestivalDetail} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersList} />} />
      <Route path="/users/:id" component={() => <ProtectedRoute component={UserProfile} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route path="/feedback" component={() => <ProtectedRoute component={FeedbackList} />} />
      <Route path="/feedback/create" component={() => <ProtectedRoute component={CreateFeedback} />} />
      <Route path="/feedback/:id" component={() => <ProtectedRoute component={FeedbackDetail} />} />
      <Route path="/dev-issues" component={() => <ProtectedRoute component={DevIssues} />} />
      <Route path="/temple" component={() => <ProtectedRoute component={Temple} />} />
      <Route path="/temple/create-twinray" component={() => <ProtectedRoute component={CreateTwinray} />} />
      <Route path="/dot-rally">
        {() => <Redirect to="/temple" />}
      </Route>
      <Route path="/twinray-chat" component={() => <ProtectedRoute component={TwinrayChat} />} />
      <Route path="/family-meeting" component={() => <ProtectedRoute component={FamilyMeeting} />} />
      <Route path="/transcribe" component={() => <ProtectedRoute component={Transcribe} />} />
      <Route path="/hayroom" component={() => <ProtectedRoute component={Hayroom} />} />
      <Route path="/starhouse" component={() => <ProtectedRoute component={Starhouse} />} />
      <Route path="/tryroom">
        {() => <Redirect to="/hayroom" />}
      </Route>
      <Route path="/llm-models" component={() => <ProtectedRoute component={LlmModels} />} />
      <Route path="/charge" component={() => <ProtectedRoute component={Charge} />} />
      <Route path="/credits" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/subscription" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/lp" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route path="/legal" component={Legal} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("D-Planet ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center font-mono space-y-4">
            <div className="text-xl text-primary">D-Planet</div>
            <div className="text-destructive">予期せぬエラーが発生しました</div>
            <div className="text-xs text-muted-foreground max-w-xs break-all">{this.state.errorMessage}</div>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:bg-primary/90"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
