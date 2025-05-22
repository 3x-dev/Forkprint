import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart2, ShoppingBag, Trash2, ChevronRight } from "lucide-react";
import React from "react";

const Dashboard = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate("/");
    }
  };

  const features = [
    {
      title: "Food Expiry Tracker",
      icon: <BarChart2 className="h-8 w-8 text-green-600" />,
      description: "Reduce household food waste. Track perishables, get expiry reminders, and learn if expired items are compostable or must be trashed.",
      goal: "Made by Jason",
      buttonText: "Track Expiries",
      path: "/feature/food-expiry",
      author: "Jason"
    },
    {
      title: "Plastic-Free Packaging Swapper",
      icon: <ShoppingBag className="h-8 w-8 text-blue-600" />,
      description: "Buy foods with low-waste or no plastic packaging. Log packaging types, see your score for choosing low-waste options, and track your choice swaps.",
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
      path: "/feature/waste-tracker",
      author: "Parth"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-4 border-b border-gray-300">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-lg text-gray-600 mt-1">Welcome back, {user?.email?.split('@')[0] || 'User'}!</p>
          </div>
        </div>

        <section className="mb-12 p-6 bg-white shadow-xl rounded-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Food Waste Insights</h2>
          <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
            <BarChart2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg">Detailed charts and graphs on your food usage and waste will appear here soon!</p>
            <p className="text-sm">Track your progress and identify areas for improvement.</p>
          </div>
        </section>

        <section className="mb-12 p-6 bg-white shadow-xl rounded-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">What's In Your Fridge?</h2>
          <div className="text-center text-gray-500 py-10 border-2 border-dashed border-gray-300 rounded-lg">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg">A list of your currently tracked food items will be displayed here.</p>
            <p className="text-sm">Quickly see what you have and what needs attention.</p>
          </div>
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
