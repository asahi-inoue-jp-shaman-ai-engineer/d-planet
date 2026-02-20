import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-auth";
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
      <Route path="/">
        <Redirect to="/islands" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
