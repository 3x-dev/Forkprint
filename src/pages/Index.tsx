import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ModeCard } from "@/components/mode-card";
import { Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Forkprint - Reduce Your Food Waste</title>
        <meta name="description" content="Welcome to Forkprint. Learn how to understand and reduce your food waste with our innovative tools and insights." />
      </Helmet>
      <Hero />
      <Features />
      
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            {/* Social links */}
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} Forkprint. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
