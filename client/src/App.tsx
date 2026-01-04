import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewMeasurement from "@/pages/NewMeasurement";
import MetricsExplorer from "@/pages/MetricsExplorer";
import Goals from "@/pages/Goals";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/measurements/new" component={NewMeasurement} />
      <Route path="/metrics" component={MetricsExplorer} />
      <Route path="/goals" component={Goals} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
