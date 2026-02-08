import React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';

export const LoginPage: React.FC = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-16" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-2">
         {/* {<div className="flex justify-center">
            <img src={LogoLogin} alt="Base Library Logo" className="w-60 h-60 object-contain" />
          </div> */}
        </div>

        <Card variant="elevated">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
             Username: test <br />
             Password: 12345678
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <SignIn
                path="/login"
                routing="path"
                signUpUrl="/register"
                afterSignInUrl="/dashboard"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
