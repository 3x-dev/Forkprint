import * as React from 'react';
import { supabase } from '@/integrations/supabase/client'; // Adjust path if necessary

const Auth: React.FC = () => {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Or a specific page after login
      },
    });
    if (error) {
      console.error('Error logging in with Google:', error.message);
      // You might want to display this error to the user
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    }
    // You might want to redirect the user or update UI after logout
  };

  // This is a simple example. You'll likely want to show
  // the logout button only when a user is logged in, and the login
  // button only when logged out. This would typically be managed
  // by checking the session state in a parent component.
  return (
    <div>
      <button 
        onClick={handleGoogleLogin} 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
      >
        Sign in with Google
      </button>
      <button 
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Logout
      </button>
    </div>
  );
};

export default Auth; 