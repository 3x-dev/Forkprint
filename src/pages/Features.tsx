import React from 'react';
import { Outlet } from 'react-router-dom';

const Features: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Features</h1>
      <p>Welcome to the features section. Select a feature from the navbar.</p>
      <Outlet /> {/* This will render nested feature routes */}
    </div>
  );
};

export default Features; 