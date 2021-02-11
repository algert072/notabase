import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AuthForm from 'components/AuthForm';

export default function Login() {
  return (
    <>
      <Head>
        <title>Log in | Atomic</title>
      </Head>
      <div className="min-h-screen bg-blue-50">
        <div className="container p-8 md:p-24">
          <div className="mx-auto card md:p-12">
            <p className="pb-6 -mt-2 text-xl text-center">Log in to Atomic</p>
            <AuthForm />
          </div>
          <p className="mt-4 text-sm text-center text-gray-700">
            Don&apos;t have an account?{' '}
            <Link href="/signup">
              <a className="text-blue-600 hover:text-blue-700">Sign up</a>
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
