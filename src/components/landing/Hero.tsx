import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { 
  Apple, 
  ArrowRight, 
  Utensils, 
  Leaf, 
  Recycle, 
  Apple as AppleIcon, 
  Droplet, 
  Coffee, 
  ShoppingBag,
  Carrot,
  Cherry,
  Banana,
  Pizza,
  EggOff,
  Milk,
  Sprout,
  Trash2,
  Zap,
  Grape,
  Fish,
  Wheat,
  TreePine,
  Star,
  Cookie,
  IceCream2,
  Sandwich
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Hero() {
  const { signInWithGoogle, user } = useAuthContext();
  const navigate = useNavigate();
  
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Hero section with gradient overlay */}
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-green-50"></div>
        
        {/* Decorative elements - floating icons with varied sizes, colors, and animations */}
        <div className="absolute top-[8%] left-[3%] text-emerald-400 animate-float opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "0s" }}>
          <Utensils size={42} />
        </div>
        <div className="absolute bottom-[12%] left-[22%] text-teal-500 animate-float-slow opacity-45 transform-gpu will-change-transform" style={{ animationDelay: "1.5s" }}>
          <Leaf size={56} />
        </div>
        <div className="absolute top-[25%] right-[8%] text-lime-400 animate-float opacity-30 transform-gpu will-change-transform" style={{ animationDelay: "0.8s" }}>
          <Recycle size={38} />
        </div>
        <div className="absolute top-[68%] right-[18%] text-cyan-400 animate-float-slow opacity-50 transform-gpu will-change-transform" style={{ animationDelay: "2.2s" }}>
          <Leaf size={24} />
        </div>
        
        <div className="absolute top-[42%] right-[32%] text-green-300 animate-float opacity-25 transform-gpu will-change-transform" style={{ animationDelay: "1.2s" }}>
          <AppleIcon size={32} />
        </div>
        <div className="absolute bottom-[38%] right-[12%] text-blue-400 animate-float-slow opacity-40 transform-gpu will-change-transform" style={{ animationDelay: "0.3s" }}>
          <Droplet size={36} />
        </div>
        <div className="absolute top-[52%] left-[8%] text-amber-500 animate-float opacity-45 transform-gpu will-change-transform" style={{ animationDelay: "1.8s" }}>
          <Coffee size={28} />
        </div>
        <div className="absolute top-[28%] left-[45%] text-emerald-300 animate-float-slow opacity-20 transform-gpu will-change-transform" style={{ animationDelay: "0.6s" }}>
          <ShoppingBag size={44} />
        </div>
        <div className="absolute bottom-[28%] left-[6%] text-teal-600 animate-float opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "2.0s" }}>
          <Recycle size={20} />
        </div>
        <div className="absolute top-[16%] right-[5%] text-green-500 animate-float-slow opacity-25 transform-gpu will-change-transform" style={{ animationDelay: "1.4s" }}>
          <Leaf size={16} />
        </div>
        
        <div className="absolute top-[12%] left-[35%] text-orange-400 animate-float opacity-30 transform-gpu will-change-transform" style={{ animationDelay: "0.9s" }}>
          <Carrot size={34} />
        </div>
        <div className="absolute bottom-[8%] right-[35%] text-pink-400 animate-float-slow opacity-40 transform-gpu will-change-transform" style={{ animationDelay: "1.6s" }}>
          <Cherry size={18} />
        </div>
        <div className="absolute top-[72%] right-[42%] text-yellow-400 animate-float opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "0.4s" }}>
          <Banana size={40} />
        </div>
        <div className="absolute top-[18%] left-[58%] text-red-400 animate-float-slow opacity-20 transform-gpu will-change-transform" style={{ animationDelay: "2.4s" }}>
          <Pizza size={48} />
        </div>
        <div className="absolute top-[48%] left-[68%] text-gray-400 animate-float opacity-15 transform-gpu will-change-transform" style={{ animationDelay: "1.0s" }}>
          <EggOff size={22} />
        </div>
        <div className="absolute bottom-[42%] right-[2%] text-indigo-300 animate-float-slow opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "0.7s" }}>
          <Milk size={30} />
        </div>
        <div className="absolute top-[3%] right-[52%] text-lime-500 animate-float opacity-25 transform-gpu will-change-transform" style={{ animationDelay: "1.7s" }}>
          <Sprout size={14} />
        </div>
        <div className="absolute bottom-[5%] left-[52%] text-rose-300 animate-float-slow opacity-30 transform-gpu will-change-transform" style={{ animationDelay: "0.5s" }}>
          <Trash2 size={26} />
        </div>
        <div className="absolute top-[38%] left-[2%] text-yellow-500 animate-float opacity-20 transform-gpu will-change-transform" style={{ animationDelay: "1.3s" }}>
          <Zap size={32} />
        </div>
        
        {/* New decorative icons with even more variation */}
        <div className="absolute top-[62%] left-[28%] text-purple-400 animate-float-slow opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "1.9s" }}>
          <Grape size={46} />
        </div>
        <div className="absolute bottom-[32%] right-[48%] text-sky-400 animate-float opacity-40 transform-gpu will-change-transform" style={{ animationDelay: "0.2s" }}>
          <Fish size={52} />
        </div>
        <div className="absolute top-[35%] right-[58%] text-amber-600 animate-float-slow opacity-25 transform-gpu will-change-transform" style={{ animationDelay: "2.1s" }}>
          <Wheat size={38} />
        </div>
        <div className="absolute bottom-[48%] left-[42%] text-green-600 animate-float opacity-30 transform-gpu will-change-transform" style={{ animationDelay: "0.1s" }}>
          <TreePine size={60} />
        </div>
        <div className="absolute top-[8%] right-[28%] text-yellow-300 animate-float-slow opacity-20 transform-gpu will-change-transform" style={{ animationDelay: "1.1s" }}>
          <Star size={12} />
        </div>
        <div className="absolute top-[58%] right-[3%] text-orange-500 animate-float opacity-45 transform-gpu will-change-transform" style={{ animationDelay: "2.3s" }}>
          <Cookie size={36} />
        </div>
        <div className="absolute bottom-[18%] left-[15%] text-cyan-500 animate-float-slow opacity-35 transform-gpu will-change-transform" style={{ animationDelay: "0.9s" }}>
          <IceCream2 size={42} />
        </div>
        <div className="absolute top-[82%] right-[12%] text-amber-400 animate-float opacity-25 transform-gpu will-change-transform" style={{ animationDelay: "1.5s" }}>
          <Sandwich size={50} />
        </div>
        
        <div className="mx-auto max-w-2xl text-center relative z-10">
          <h1 
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl animate-slide-in-up transform-gpu will-change-transform"
            style={{ animationDelay: "200ms" }}
          >
            Fork Over 
            <span className="bg-gradient-to-r from-green-600 to-teal-500 bg-clip-text text-transparent"> Waste.</span>
          </h1>
          
          <p 
            className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in transform-gpu will-change-transform"
            style={{ animationDelay: "400ms" }}
          >
            Track food expiration dates, reduce food waste, and make the most of your groceries with Forkprint.
          </p>
          
          <div 
            className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in transform-gpu will-change-transform"
            style={{ animationDelay: "600ms" }}
          >
            {!user ? (
              <Button 
                onClick={() => signInWithGoogle()} 
                className="flex items-center gap-2 rounded-full px-6 py-6 text-base font-semibold shadow-lg hover:bg-green-600 transition-all duration-300 bg-green-500 transform hover:scale-105"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 rounded-full px-6 py-6 text-base font-semibold shadow-lg hover:bg-green-600 transition-all duration-300 bg-green-500 transform hover:scale-105"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}