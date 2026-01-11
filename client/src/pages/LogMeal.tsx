import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Check, Loader2, UploadCloud, X, Plus } from "lucide-react";
import {
  useAnalyzeImage,
  useCreateMeal,
  type AIProvider,
} from "@/hooks/use-nutrition";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AnalyzeImageResponse } from "@shared/schema";

type Step = "upload" | "analyze" | "review";

export default function LogMeal() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeImageResponse | null>(null);
  const [mealType, setMealType] = useState("lunch");
  const [isUploading, setIsUploading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>("openai");

  const { mutate: analyzeImage, isPending: isAnalyzing } = useAnalyzeImage();
  const { mutate: createMeal, isPending: isCreating } = useCreateMeal();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setIsUploading(true);

    try {
      // Convert to base64 data URL for preview and analysis
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        setIsUploading(false);
        setStep("analyze");

        // Analyze the image
        analyzeImage(
          { imageUrl: dataUrl, provider: aiProvider },
          {
            onSuccess: (data) => {
              setAnalysis(data);
              setStep("review");
            },
            onError: (err) => {
              toast({
                title: "Analysis Failed",
                description: err.message,
                variant: "destructive",
              });
              setStep("upload");
            },
          }
        );
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload failed", err);
      setIsUploading(false);
      toast({
        title: "Upload Failed",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    if (!analysis) return;

    createMeal(
      {
        mealType: mealType as "breakfast" | "lunch" | "dinner" | "snack",
        imageUrl: imageUrl,
        date: format(new Date(), "yyyy-MM-dd"),
        items: analysis.foods.map((f) => ({
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          quantity: f.quantity,
          unit: f.unit,
        })),
      },
      {
        onSuccess: () => {
          toast({
            title: "Meal Logged",
            description: "Your meal has been saved successfully.",
          });
          setLocation("/nutrition");
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const removeItem = (idx: number) => {
    if (!analysis) return;
    const newFoods = [...analysis.foods];
    newFoods.splice(idx, 1);
    setAnalysis({ ...analysis, foods: newFoods });
  };

  const handleBack = () => {
    if (step === "upload") {
      setLocation("/nutrition");
    } else {
      setStep("upload");
      setImageUrl(null);
      setAnalysis(null);
    }
  };

  return (
    <PageLayout
      title="Log Meal"
      actions={
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm min-h-[500px] relative">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
                {isUploading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-primary" />
                )}
              </div>
              <h2 className="font-bold text-2xl mb-2">Upload Meal Photo</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                Take a photo of your food. AI will identify ingredients and
                macros.
              </p>

              <div className="flex gap-2 mb-6">
                {(["openai", "gemini"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAiProvider(p)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      aiProvider === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {p === "openai" ? "OpenAI" : "Gemini"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Button
                  size="lg"
                  className="rounded-full px-8"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Select Photo"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZE */}
          {step === "analyze" && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-xl ring-4 ring-background">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Meal"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-2xl mb-2">Analyzing...</h2>
                <p className="text-muted-foreground">
                  Identifying foods and calculating macros
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === "review" && analysis && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              {imageUrl && (
                <div className="h-48 w-full relative">
                  <img
                    src={imageUrl}
                    alt="Meal"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                        (t) => (
                          <button
                            key={t}
                            onClick={() => setMealType(t)}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                              mealType === t
                                ? "bg-white text-black"
                                : "bg-black/40 text-white border border-white/20 backdrop-blur-sm"
                            )}
                          >
                            {t}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl">Detected Items</h3>
                </div>

                <div className="space-y-3">
                  {analysis.foods.map((food, idx) => (
                    <div
                      key={idx}
                      className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-foreground">
                          {food.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          {food.calories} cal • {food.protein}p • {food.carbs}c
                          • {food.fat}f
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold bg-background px-3 py-1 rounded-md border border-border">
                          {food.quantity} {food.unit}
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-end mb-6">
                    <div className="text-muted-foreground font-medium">
                      Total Calories
                    </div>
                    <div className="font-bold text-3xl text-primary">
                      {analysis.foods.reduce((sum, f) => sum + f.calories, 0)}
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full rounded-xl text-lg h-14 font-bold shadow-lg shadow-primary/20"
                    onClick={handleSave}
                    disabled={isCreating || analysis.foods.length === 0}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" /> Log Meal
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
