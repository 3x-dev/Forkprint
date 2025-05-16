import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Smart Sort Game</Link>
        <ul className="flex space-x-4">
          <li><Link to="/" className="hover:text-gray-300">Smart Sort</Link></li>
          <li><Link to="/about" className="hover:text-gray-300">About</Link></li>
          <li className="relative group">
            <span className="hover:text-gray-300 cursor-pointer">Features</span>
            <ul className="absolute hidden group-hover:block bg-gray-700 text-white mt-2 py-2 rounded shadow-lg w-48">
              <li><Link to="/features/food-tracking" className="block px-4 py-2 hover:bg-gray-600">Food Tracking</Link></li>
              <li><Link to="/features/feature2" className="block px-4 py-2 hover:bg-gray-600">Feature 2</Link></li>
              <li><Link to="/features/feature3" className="block px-4 py-2 hover:bg-gray-600">Feature 3</Link></li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar; 