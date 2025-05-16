
import { StarIcon } from "lucide-react";

export function Testimonial() {
  return (
    <section className="bg-green-50 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 text-green-600">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by home cooks everywhere
          </p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-2 sm:text-[0] lg:columns-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="pt-8 sm:inline-block sm:w-full sm:px-4">
                <figure className="rounded-2xl bg-white p-8 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
                  <div className="flex gap-x-1 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} className="h-5 w-5 flex-none" />
                    ))}
                  </div>
                  <blockquote className="mt-6 text-gray-700">
                    <p>
                      "This app has completely changed how I manage my groceries. I've reduced my food waste by almost 70% and I'm saving money every month."
                    </p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-lg">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {['Alex Johnson', 'Jamie Smith', 'Taylor Brown'][i]}
                      </div>
                      <div className="text-gray-600">{['Home Cook', 'Food Enthusiast', 'Busy Parent'][i]}</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
