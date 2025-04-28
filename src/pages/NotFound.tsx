
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-smartsort-light-green flex flex-col items-center justify-center p-4">
      <Logo size="lg" />
      
      <div className="glass-card p-8 mt-8 text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Oops! This page has been improperly sorted.
        </p>
        <Button onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
