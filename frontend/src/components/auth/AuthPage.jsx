import React from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { Shield } from 'lucide-react';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-2 sm:px-0">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">ExpiryGuard</h1>
          <p className="mt-2 text-gray-600">Track your products and never let them expire</p>
        </div>
        <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-center mb-6 gap-2 sm:gap-0">
            <button
              onClick={() => setIsSignUp(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isSignUp ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isSignUp ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>
          <div className="flex justify-center">
            {isSignUp ? <SignupForm /> : <LoginForm />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;