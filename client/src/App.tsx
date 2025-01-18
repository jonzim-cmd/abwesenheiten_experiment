import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AttendanceAnalyzer from "@/pages/attendance";
import { config } from "./lib/config";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function Router() {
  return (
    <WouterRouter base={config.baseUrl}>
      <Switch>
        {/* The path should be relative to the base URL */}
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
      <ThemeToggle />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
