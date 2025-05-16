
import { CheckCircle2 } from "lucide-react";

const features = [
  {
    name: 'Expiration Tracking',
    description: 'Get alerts before your food expires so nothing goes to waste.',
  },
  {
    name: 'Smart Inventory',
    description: 'Automatically keep track of what you have in your fridge and pantry.',
  },
  {
    name: 'Recipe Suggestions',
    description: 'Find recipes based on the ingredients you already have.',
  },
  {
    name: 'Shopping Lists',
    description: 'Create smart shopping lists that know what you need.',
  },
];

export function Features() {
  return (
    <div className="bg-white py-24 sm:py-32">
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
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
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
