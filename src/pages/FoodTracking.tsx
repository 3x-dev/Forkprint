import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const FoodTracking: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Food Expiry Tracker</h2>
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <p>Food tracking feature placeholder. API integrations will go here.</p>
    </div>
  );
};

export default FoodTracking; 