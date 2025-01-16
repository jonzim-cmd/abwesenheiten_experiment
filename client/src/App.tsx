import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AttendanceAnalyzer from "@/pages/attendance";

// Get base URL from environment variable, default to '/' if not set
const base = import.meta.env.VITE_BASE_URL || '/';

function Router() {
  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path="/" component={AttendanceAnalyzer} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;