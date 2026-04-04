
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Robustly get the token, ensuring it's a string
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (params?.token) {
      const tokenValue = Array.isArray(params.token) ? params.token[0] : params.token;
      setToken(tokenValue);
    }
  }, [params]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token, // This is now guaranteed to be a string
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong.');
      }

      setSuccess(data.message);
      setTimeout(() => {
        router.push('/auth');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Reset Your Password</h2>
        
        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-green-600">{success}</p>
            <p className="mt-4">
              You will be redirected to the <Link href="/auth" className="text-indigo-600 hover:underline">Login</Link> page shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
