import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import NewMeasurement from "@/pages/NewMeasurement";
import MetricsExplorer from "@/pages/MetricsExplorer";
import Goals from "@/pages/Goals";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ImportData from "@/pages/ImportData";
import Calculator from "@/pages/Calculator";
import Habits from "@/pages/Habits";
import CreateHabit from "@/pages/CreateHabit";
import HabitDetail from "@/pages/HabitDetail";
import Friends from "@/pages/Friends";
import Nutrition from "@/pages/Nutrition";
import NutritionSettings from "@/pages/NutritionSettings";
import LogMeal from "@/pages/LogMeal";
import Ingredients from "@/pages/Ingredients";
import ScanIngredients from "@/pages/ScanIngredients";
import RecipeSuggestions from "@/pages/RecipeSuggestions";
import SavedRecipes from "@/pages/SavedRecipes";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/measurements/new">
        <ProtectedRoute>
          <NewMeasurement />
        </ProtectedRoute>
      </Route>
      <Route path="/metrics">
        <ProtectedRoute>
          <MetricsExplorer />
        </ProtectedRoute>
      </Route>
      <Route path="/goals">
        <ProtectedRoute>
          <Goals />
        </ProtectedRoute>
      </Route>
      <Route path="/import">
        <ProtectedRoute>
          <ImportData />
        </ProtectedRoute>
      </Route>
      <Route path="/calculator">
        <ProtectedRoute>
          <Calculator />
        </ProtectedRoute>
      </Route>
      <Route path="/habits">
        <ProtectedRoute>
          <Habits />
        </ProtectedRoute>
      </Route>
      <Route path="/habits/new">
        <ProtectedRoute>
          <CreateHabit />
        </ProtectedRoute>
      </Route>
      <Route path="/habits/:id">
        <ProtectedRoute>
          <HabitDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/friends">
        <ProtectedRoute>
          <Friends />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition">
        <ProtectedRoute>
          <Nutrition />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/log">
        <ProtectedRoute>
          <LogMeal />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/settings">
        <ProtectedRoute>
          <NutritionSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/ingredients">
        <ProtectedRoute>
          <Ingredients />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/ingredients/scan">
        <ProtectedRoute>
          <ScanIngredients />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/recipes">
        <ProtectedRoute>
          <RecipeSuggestions />
        </ProtectedRoute>
      </Route>
      <Route path="/nutrition/recipes/saved">
        <ProtectedRoute>
          <SavedRecipes />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
