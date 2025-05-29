import { Helmet } from "react-helmet-async";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Apple, ShoppingBag, Trash2, ChevronRight, Package } from "lucide-react";
import * as React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FridgeDisplay, { FoodItem } from "@/components/dashboard/FridgeDisplay";

const Dashboard = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [fridgeItems, setFridgeItems] = useState<FoodItem[]>([]);
  const [isLoadingFridge, setIsLoadingFridge] = useState(true);

  useEffect(() => {
    const fetchFridgeContents = async () => {
      if (!user) {
        setIsLoadingFridge(false);
        return;
      }
      setIsLoadingFridge(true);
      try {
        const { data, error } = await supabase
          .from('food_items')
          .select('id, name, expiry_date, image_url, amount')
          .eq('user_id', user.id)
          .order('expiry_date', { ascending: true });

        if (error) throw error;
        setFridgeItems(data || []);
      } catch (error) {
        console.error("Error fetching fridge contents for dashboard:", error);
        setFridgeItems([]);
      } finally {
        setIsLoadingFridge(false);
      }
    };

    fetchFridgeContents();
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate("/");
    }
  };

  const features = [
    {
      title: "Food Expiry Tracker",
      icon: <Apple className="h-8 w-8 text-green-600" />,
      description: "Reduce household food waste. Track perishables, get expiry reminders, and learn if expired items are compostable or must be trashed.",
      goal: "Made by Jason",
      buttonText: "Track Expiries",
      path: "/feature/food-expiry",
      author: "Jason"
    },
    {
      title: "Sustainable Packaging Swapper",
      icon: <ShoppingBag className="h-8 w-8 text-blue-600" />,
      description: "Log your packaging choices, track swaps from less sustainable to more sustainable options, and see your positive impact grow.",
      goal: "Made by Aryan",
      buttonText: "Log Packaging",
      path: "/feature/packaging-swap",
      author: "Aryan"
    },
    {
      title: "Food Waste Logger",
      icon: <Trash2 className="h-8 w-8 text-red-600" />,
      description: "Log what you served and what was left uneaten. Automatically calculates the percentage wasted and total food waste over time for your meals.",
      goal: "Made by Parth",
      buttonText: "Log Food Waste",
      path: "/feature/food-waste-logger",
      author: "Parth"
    }
  ];

  const handleNavigateToTracker = () => {
    navigate("/feature/food-expiry");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-8">
      <Helmet>
        <title>Your Dashboard - Forkprint</title>
        <meta name="description" content="Track your food waste, view sustainability insights, and manage your progress on Forkprint." />
      </Helmet>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-4 border-b border-gray-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-lg text-gray-600 mt-1">Welcome back, {user?.email?.split('@')[0] || 'User'}!</p>
          </div>
        </div>

        <div>
          {/* <section className="mb-12 p-6 bg-white shadow-xl rounded-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Food Waste Insights</h2>
            <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
              <BarChart2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg">Detailed charts and graphs on your food usage and waste will appear here soon!</p>
              <p className="text-sm">Track your progress and identify areas for improvement.</p>
            </div>
          </section> */}
        </div>

        <section className="mb-12 p-6 bg-white shadow-xl rounded-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">What's In Your Fridge?</h2>
          <FridgeDisplay 
            items={fridgeItems} 
            isLoading={isLoadingFridge} 
            onNavigateToTracker={handleNavigateToTracker} 
          />
          { !isLoadingFridge && fridgeItems.length > 0 && (
            <div className="text-center mt-6">
              <Button 
                onClick={handleNavigateToTracker} 
                variant="outline" 
                className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                Manage Items in Tracker <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-8 text-center">Explore Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white shadow-2xl rounded-xl border border-gray-200 flex flex-col overflow-hidden hover:shadow-green-200/50 transition-shadow duration-300">
                <div className="p-6 flex-grow">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mx-auto">
                     {React.cloneElement(feature.icon, { className: feature.icon.props.className + ' block' })}
                  </div>
                  <div className="mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">{feature.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed">{feature.description}</p>
                  <p className="text-xs text-gray-500 italic mb-4">Made by {feature.author}</p>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <Button 
                    onClick={() => navigate(feature.path)} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white transition-colors group"
                  >
                    {feature.buttonText}
                    <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
