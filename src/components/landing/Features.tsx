import { CheckCircle2 } from "lucide-react";

const features = [
  {
    name: 'Food Expiry',
    description: `Track food expiration dates with reminders and composting guidance to reduce food waste.`,
  },
  {
    name: 'Sustainable Packaging Swapping',
    description: `Log your packaging choices and track your progress towards using less high waste packaging and making sustainable swaps.`,
  },
  {
    name: 'Food Waste Tracker',
    description: `Monitor your food consumption, calculate food waste, and get tips to improve your habits.`,
  },
];

export function Features() {
  return (
    <div className="relative bg-green-100 py-24 sm:py-32 overflow-hidden">
      {/* Wave pattern at the top */}
      <div className="absolute top-0 left-0 right-0 h-16 overflow-hidden">
        <svg 
          className="absolute bottom-0 w-full h-20 text-white" 
          viewBox="0 0 1440 100" 
          preserveAspectRatio="none"
        >
          <path 
            fill="currentColor" 
            d="M0,0 C240,70 480,100 720,70 C960,40 1200,10 1440,80 L1440,0 L0,0 Z"
          ></path>
        </svg>
      </div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-green-600 animate-fade-in transform-gpu will-change-transform" style={{ animationDelay: "100ms" }}>Forkprint Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl animate-slide-in-up transform-gpu will-change-transform" style={{ animationDelay: "200ms" }}>
            Manage Your Food, Minimize Your Waste
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in transform-gpu will-change-transform" style={{ animationDelay: "300ms" }}>
            Forkprint helps you reduce food waste, save money, and ensure you always have what you need, smartly.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 lg:gap-y-16">
            {features.map((feature, index) => (
              <div 
                key={feature.name} 
                className="relative pl-12 opacity-0 animate-slide-in-up transform-gpu will-change-transform"
                style={{ animationDelay: `${index * 150 + 500}ms` }}
              >
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <CheckCircle2 className="absolute left-0 top-1 h-8 w-8 text-green-500" />
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      
      {/* Wave pattern at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden transform rotate-180">
        <svg 
          className="absolute bottom-0 w-full h-20 text-white" 
          viewBox="0 0 1440 100" 
          preserveAspectRatio="none"
        >
          <path 
            fill="currentColor" 
            d="M0,0 C240,70 480,100 720,70 C960,40 1200,10 1440,80 L1440,0 L0,0 Z"
          ></path>
        </svg>
      </div>
    </div>
  );
}
