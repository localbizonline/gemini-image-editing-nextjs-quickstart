"use client";
import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { ImagePromptInput } from "@/components/ImagePromptInput";
import { ImageResultDisplay } from "@/components/ImageResultDisplay";
import { ImageIcon, Wand2, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { HistoryItem } from "@/lib/types";
import { ProposalDisplay } from "@/components/ProposalDisplay";
import { SettingsModal } from "@/components/SettingsModal";

interface ProposalData {
  title: string;
  description: string;
  cost: string;
  image1: string | null;
  image2: string | null;
  generatedImage: string | null;
}

export default function Home() {
  const [proposalData, setProposalData] = useState<ProposalData>({
    title: "",
    description: "",
    cost: "",
    image1: null,
    image2: null,
    generatedImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(
    "Create a realistic visualization of how this {title} will look when installed at the client's location. Make it look natural and professional."
  );

  const handleImage1Select = (imageData: string) => {
    setProposalData(prev => ({ ...prev, image1: imageData || null }));
  };

  const handleImage2Select = (imageData: string) => {
    setProposalData(prev => ({ ...prev, image2: imageData || null }));
  };

  const handleGenerateImage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!proposalData.image1 || !proposalData.image2) {
        throw new Error("Please upload both product and client site images");
      }

      const prompt = customPrompt.replace("{title}", proposalData.title);

      console.log("Sending request to generate image...");
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image: [proposalData.image1, proposalData.image2],
          history: [],
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate image";
        try {
          const errorData = await response.json();
          console.error("Error response:", errorData);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Received image data:", {
        hasImage: !!data.image,
        imageLength: data.image?.length,
        description: data.description
      });

      if (!data.image) {
        throw new Error("No image data received from API");
      }

      setProposalData(prev => {
        console.log("Setting generated image in state");
        return { ...prev, generatedImage: data.image };
      });
    } catch (error) {
      console.error("Error in handleGenerateImage:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProposalData, value: string) => {
    setProposalData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setProposalData({
      title: "",
      description: "",
      cost: "",
      image1: null,
      image2: null,
      generatedImage: null,
    });
    setShowProposal(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-4xl border-0 bg-card shadow-none">
        <CardHeader className="flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="w-8 h-8 text-primary" />
              Contractor Proposal Generator
            </CardTitle>
            <SettingsModal prompt={customPrompt} onPromptChange={setCustomPrompt} />
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            Create professional proposals with visualizations
          </span>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 w-full">
          {error && (
            <div className="p-4 mb-4 text-sm rounded-lg bg-red-100 text-red-700">
              {error}
            </div>
          )}

          {!showProposal ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Title</label>
                  <Input
                    value={proposalData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Custom Pool Installation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Description</label>
                  <Textarea
                    value={proposalData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe the project details..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated Cost</label>
                  <Input
                    value={proposalData.cost}
                    onChange={(e) => handleInputChange("cost", e.target.value)}
                    placeholder="e.g., $25,000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload
                  onImageSelect={handleImage1Select}
                  currentImage={proposalData.image1}
                  label="Product Image"
                />
                <ImageUpload
                  onImageSelect={handleImage2Select}
                  currentImage={proposalData.image2}
                  label="Client Site Image"
                />
              </div>

              {proposalData.generatedImage && (
                <div className="mt-6 p-4 bg-white rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Generated Visualization</h3>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <img
                      src={proposalData.generatedImage}
                      alt="Generated visualization"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setProposalData(prev => ({ ...prev, generatedImage: null }))}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleGenerateImage}
                  disabled={loading || !proposalData.image1 || !proposalData.image2}
                >
                  {loading ? "Generating..." : "Generate Visualization"}
                </Button>
                <Button
                  onClick={() => setShowProposal(true)}
                  disabled={!proposalData.generatedImage || !proposalData.title || !proposalData.description || !proposalData.cost}
                >
                  View Proposal
                </Button>
              </div>
            </div>
          ) : (
            <ProposalDisplay
              title={proposalData.title}
              description={proposalData.description}
              cost={proposalData.cost}
              imageUrl={proposalData.generatedImage || ""}
              onEdit={() => setShowProposal(false)}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
