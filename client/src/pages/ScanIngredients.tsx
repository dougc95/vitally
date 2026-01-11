import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  useScanIngredients,
  useAddIngredients,
  type AIProvider,
} from "@/hooks/use-ingredients";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ScannedIngredient } from "@shared/schema";

type Step = "upload" | "scanning" | "review";

export default function ScanIngredients() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scannedIngredients, setScannedIngredients] = useState<
    ScannedIngredient[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>("openai");

  const { mutate: scanIngredients, isPending: isScanning } =
    useScanIngredients();
  const { mutate: addIngredients, isPending: isAdding } = useAddIngredients();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        setIsUploading(false);
        setStep("scanning");

        scanIngredients(
          { imageUrl: dataUrl, provider: aiProvider },
          {
            onSuccess: (data) => {
              setScannedIngredients(data.ingredients);
              setStep("review");
            },
            onError: (err) => {
              toast({
                title: "Scan Failed",
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
    if (scannedIngredients.length === 0) return;

    addIngredients(
      {
        ingredients: scannedIngredients.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category as any,
        })),
      },
      {
        onSuccess: () => {
          toast({
            title: "Ingredients Added",
            description: `${scannedIngredients.length} ingredients added to your pantry`,
          });
          setLocation("/nutrition/ingredients");
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

  const removeIngredient = (idx: number) => {
    setScannedIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBack = () => {
    if (step === "upload") {
      setLocation("/nutrition/ingredients");
    } else {
      setStep("upload");
      setImageUrl(null);
      setScannedIngredients([]);
    }
  };

  return (
    <PageLayout
      title="Scan Ingredients"
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
              <h2 className="font-bold text-2xl mb-2">Scan Ingredients</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                Take a photo of your groceries or fridge. AI will identify
                ingredients.
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
                  {isUploading ? "Processing..." : "Select Photo"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING */}
          {step === "scanning" && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-xl ring-4 ring-background">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-2xl mb-2">Scanning...</h2>
                <p className="text-muted-foreground">
                  Identifying ingredients in your photo
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === "review" && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              {imageUrl && (
                <div className="h-40 w-full relative">
                  <img
                    src={imageUrl}
                    alt="Scan"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-6">
                    <h3 className="text-white font-bold text-lg">
                      {scannedIngredients.length} ingredients found
                    </h3>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl">Review Ingredients</h3>
                </div>

                {scannedIngredients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ingredients detected. Try another photo.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scannedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-medium">{ing.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ing.quantity} {ing.unit} • {ing.category}
                          </div>
                        </div>
                        <button
                          onClick={() => removeIngredient(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full rounded-xl text-lg h-14 font-bold"
                  onClick={handleSave}
                  disabled={isAdding || scannedIngredients.length === 0}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" /> Add to Pantry
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
