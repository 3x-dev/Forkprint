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
  Sun
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
        
        {/* Decorative elements - floating icons */}
        <div className="absolute top-20 left-10 text-green-200 animate-float opacity-40">
          <Utensils size={36} />
        </div>
        <div className="absolute bottom-20 left-1/4 text-teal-200 animate-float-slow opacity-50">
          <Leaf size={48} />
        </div>
        <div className="absolute top-1/3 right-16 text-green-300 animate-float animate-pulse-opacity">
          <Recycle size={40} />
        </div>
        <div className="absolute top-2/3 right-1/4 text-teal-300 animate-float-slow opacity-40">
          <Leaf size={32} />
        </div>
        
        {/* Additional decorative elements */}
        <div className="absolute top-40 right-[30%] text-green-200 animate-float-slow opacity-30">
          <AppleIcon size={24} />
        </div>
        <div className="absolute bottom-40 right-[15%] text-teal-300 animate-float opacity-40">
          <Droplet size={28} />
        </div>
        <div className="absolute top-[45%] left-[15%] text-green-300 animate-float opacity-35">
          <Coffee size={32} />
        </div>
        <div className="absolute top-[35%] left-[40%] text-green-200 animate-float-slow opacity-25">
          <ShoppingBag size={36} />
        </div>
        <div className="absolute bottom-[30%] left-[10%] text-teal-300 animate-float opacity-40">
          <Recycle size={28} />
        </div>
        <div className="absolute top-[20%] right-[10%] text-green-200 animate-float-slow opacity-30">
          <Leaf size={20} />
        </div>
        
        {/* Even more decorative elements */}
        <div className="absolute top-[15%] left-[28%] text-green-300 animate-float opacity-20">
          <Carrot size={28} />
        </div>
        <div className="absolute bottom-[15%] right-[28%] text-teal-400 animate-float-slow opacity-30">
          <Cherry size={22} />
        </div>
        <div className="absolute top-[60%] right-[35%] text-amber-300 animate-float opacity-25">
          <Banana size={30} />
        </div>
        <div className="absolute top-[25%] left-[50%] text-orange-300 animate-float-slow opacity-20">
          <Pizza size={32} />
        </div>
        <div className="absolute top-[55%] left-[60%] text-gray-300 animate-float opacity-15">
          <EggOff size={24} />
        </div>
        <div className="absolute bottom-[45%] right-[5%] text-blue-200 animate-float-slow opacity-30">
          <Milk size={26} />
        </div>
        <div className="absolute top-[5%] right-[45%] text-green-400 animate-float opacity-20">
          <Sprout size={18} />
        </div>
        <div className="absolute bottom-[10%] left-[45%] text-red-200 animate-float-slow opacity-25">
          <Trash2 size={20} />
        </div>
        <div className="absolute top-[38%] left-[5%] text-yellow-300 animate-float opacity-15">
          <Zap size={22} />
        </div>
        <div className="absolute top-[10%] left-[18%] text-yellow-200 animate-float-slow opacity-20">
          <Sun size={24} />
        </div>
        
        <div className="mx-auto max-w-2xl text-center relative z-10">
          <h1 
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl animate-slide-in-up"
            style={{ animationDelay: "200ms" }}
          >
            Fork Over 
            <span className="bg-gradient-to-r from-green-600 to-teal-500 bg-clip-text text-transparent"> Waste.</span>
          </h1>
          
          <p 
            className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in"
            style={{ animationDelay: "400ms" }}
          >
            Track food expiration dates, reduce food waste, and make the most of your groceries with Forkprint.
          </p>
          
          <div 
            className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in"
            style={{ animationDelay: "600ms" }}
          >
            {!user ? (
              <Button 
                onClick={() => signInWithGoogle()} 
                className="flex items-center gap-2 rounded-full px-6 py-6 text-base font-semibold shadow-lg hover:bg-green-600 transition-all duration-200 bg-green-500"
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
                className="flex items-center gap-2 rounded-full px-6 py-6 text-base font-semibold shadow-lg hover:bg-green-600 transition-all duration-200 bg-green-500"
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