'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    if (res?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/'); // or wherever your homepage is
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1d1d1d]">
      <form
        onSubmit={handleSubmit}
        className="bg-[#bdb29e] p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Login</h1>

        {error && <p className="text-red-600">{error}</p>}

        <div>
          <label>Email:</label>
          <input
            type="email"
            className="w-full mt-1 p-2 rounded bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            className="w-full mt-1 p-2 rounded bg-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-[#1d1d1d] text-white px-4 py-2 rounded hover:bg-black transition"
        >
          Login
        </button>

        <p className="text-sm mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:underline">
                Register here
            </Link>
        </p>
      </form>
    </div>
  );
}