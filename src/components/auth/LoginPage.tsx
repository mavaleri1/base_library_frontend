import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import LogoLogin from './logo/LogoLogin.jpg';

export const LoginPage: React.FC = () => {
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
