import { Button } from "./ui/button";
import { DollarSign } from "lucide-react";

interface ProposalDisplayProps {
  title: string;
  description: string;
  cost: string;
  imageUrl: string;
  onEdit: () => void;
}

export function ProposalDisplay({
  title,
  description,
  cost,
  imageUrl,
  onEdit,
}: ProposalDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onEdit}>
          Edit Proposal
        </Button>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <div className="mb-6">
          <img
            src={imageUrl}
            alt="Project Visualization"
            className="w-full rounded-lg shadow-lg"
          />
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Project Description</h2>
          <p className="text-gray-700 whitespace-pre-line">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-2xl font-bold text-primary">
          <DollarSign className="w-6 h-6" />
          <span>{cost}</span>
        </div>
      </div>
    </div>
  );
} 