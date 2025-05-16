import { CheckCircle2 } from "lucide-react";

const features = [
  {
    name: 'Food Expiry',
    description: `Track food expiration dates with reminders and composting guidance to reduce waste.`,
  },
  {
    name: 'Plastic-Free Packaging Swapping',
    description: `Log your packaging choices and track your progress towards using less plastic.`,
  },
  {
    name: 'Food Waste Tracker',
    description: `Monitor your food consumption, calculate waste, and get tips to improve your habits.`,
  },
];

export function Features() {
  return (
    <div className="bg-green-100 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-green-600">Smart Food Management</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to manage your food efficiently
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our app helps you reduce food waste, save money, and ensure you always have what you need.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-12">
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
    </div>
  );
}
