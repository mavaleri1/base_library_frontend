import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui';
import { Shield, UserPlus } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 px-4 py-8">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-ink mb-2">Base Library</h1>
          <p className="text-muted">Educational content generation system</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Create account
            </CardTitle>
            <CardDescription>
              Sign up to start using Base Library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <SignUp
                path="/register"
                routing="path"
                signInUrl="/login"
                afterSignUpUrl="/dashboard"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
