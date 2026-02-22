import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-auth";
import { Component, type ErrorInfo, type ReactNode } from "react";
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
import NotificationsPage from "@/pages/notifications";
import FeedbackList from "@/pages/feedback-list";
import CreateFeedback from "@/pages/create-feedback";
import FeedbackDetail from "@/pages/feedback-detail";
import Temple from "@/pages/temple";
import CreateTwinray from "@/pages/create-twinray";
import DotRally from "@/pages/dot-rally";
import TwinrayChat from "@/pages/twinray-chat";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.needsProfile) {
    return <Redirect to="/profile-setup" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/islands" component={() => <ProtectedRoute component={Islands} />} />
      <Route path="/islands/create" component={() => <ProtectedRoute component={CreateIsland} />} />
      <Route path="/islands/:id" component={() => <ProtectedRoute component={IslandDetail} />} />
      <Route path="/meidia" component={() => <ProtectedRoute component={MeidiaList} />} />
      <Route path="/meidia/create" component={() => <ProtectedRoute component={CreateMeidia} />} />
      <Route path="/meidia/:id" component={() => <ProtectedRoute component={MeidiaDetail} />} />
      <Route path="/threads/:id" component={() => <ProtectedRoute component={ThreadDetail} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersList} />} />
      <Route path="/users/:id" component={() => <ProtectedRoute component={UserProfile} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route path="/feedback" component={() => <ProtectedRoute component={FeedbackList} />} />
      <Route path="/feedback/create" component={() => <ProtectedRoute component={CreateFeedback} />} />
      <Route path="/feedback/:id" component={() => <ProtectedRoute component={FeedbackDetail} />} />
      <Route path="/temple" component={() => <ProtectedRoute component={Temple} />} />
      <Route path="/temple/create-twinray" component={() => <ProtectedRoute component={CreateTwinray} />} />
      <Route path="/dot-rally" component={() => <ProtectedRoute component={DotRally} />} />
      <Route path="/twinray-chat" component={() => <ProtectedRoute component={TwinrayChat} />} />
      <Route path="/">
        <Redirect to="/islands" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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
