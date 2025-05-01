
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageUpload: (url: string) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageUpload(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors",
        isDragging ? "border-smartsort-green bg-smartsort-light-green/50" : "border-gray-200 bg-gray-50",
        "cursor-pointer"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
    >
      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-smartsort-light-green rounded-full mb-4">
          <Upload className="h-6 w-6 text-smartsort-green" />
        </div>
        <h3 className="text-lg font-medium mb-2">Upload an image for sorting</h3>
        <p className="text-sm text-gray-500 mb-4">
          Take a photo or upload an image of waste items to get sorting suggestions
        </p>
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={triggerFileInput}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
          <Button variant="outline" onClick={triggerFileInput}>
            <Image className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
