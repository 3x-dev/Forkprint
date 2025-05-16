import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LiveMode from "./pages/LiveMode";
import TimedMode from "./pages/TimedMode";
import WasteSorter from "./pages/WasteSorter";
import NotFound from "./pages/NotFound";
import Navbar from "./components/Navbar";
import About from "./pages/About";
import Features from "./pages/Features";
import FoodTracking from "./pages/FoodTracking";
import Feature2 from "./pages/Feature2";
import Feature3 from "./pages/Feature3";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/smart-sort" element={<Index />} />
          <Route path="/live-mode" element={<LiveMode />} />
          <Route path="/timed-mode" element={<TimedMode />} />
          <Route path="/waste-sorter" element={<WasteSorter />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />}>
            <Route path="food-tracking" element={<FoodTracking />} />
            <Route path="feature2" element={<Feature2 />} />
            <Route path="feature3" element={<Feature3 />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
