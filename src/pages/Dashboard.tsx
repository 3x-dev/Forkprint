
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
      </div>
      
      <p className="text-lg mb-4">
        Welcome, {user?.email}!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-lg mb-2">Pantry Items</h3>
          <p className="text-gray-600">Manage your pantry inventory</p>
          <Button className="mt-4">View Pantry</Button>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-lg mb-2">Expiring Soon</h3>
          <p className="text-gray-600">Items that need to be used soon</p>
          <Button className="mt-4">Check Items</Button>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-lg mb-2">Shopping List</h3>
          <p className="text-gray-600">Plan your next grocery run</p>
          <Button className="mt-4">View List</Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
