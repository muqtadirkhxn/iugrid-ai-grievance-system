import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import {
  createUserProfile,
  fetchUserProfile,
  getUserFromAuth,
  resetDbCheck,
} from '../lib/data-layer';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .trim()
    .min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      3,
      'Full name must be at least 3 characters'
    )
    .regex(
      /^[A-Za-z\s]+$/,
      'Full name must contain alphabets only'
    ),

  email: z
    .string()
    .trim()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .trim()
    .min(
      6,
      'Password must be at least 6 characters'
    ),

  role: z.enum(['student', 'admin']),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function Login() {
  const navigate = useNavigate();

  const { setUser, setToken } =
    useAuthStore();

  const [isLogin, setIsLogin] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    showLoginPassword,
    setShowLoginPassword,
  ] = useState(false);

  const [
    showSignupPassword,
    setShowSignupPassword,
  ] = useState(false);

  const schema = isLogin
    ? loginSchema
    : signupSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginForm | SignupForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (
    formData: LoginForm | SignupForm
  ) => {
    setLoading(true);
    setError('');

    try {
      resetDbCheck();

      // LOGIN
      if (isLogin) {
        const loginData =
          formData as LoginForm;

        const {
          data,
          error: loginError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: loginData.email,
              password:
                loginData.password,
            }
          );

        if (loginError) {
          setError(
            loginError.message
          );
          return;
        }

        if (!data.session) {
          setError(
            'Unable to create session'
          );
          return;
        }

        setToken(
          data.session.access_token
        );

        let profile =
          await fetchUserProfile(
            data.user.id
          );

        if (!profile) {
          profile =
            getUserFromAuth(
              data.session
            );

          await createUserProfile(
            profile
          );
        }

        setUser(profile);

        if (
          profile.role === 'admin'
        ) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }

      // SIGNUP
      else {
        const signupData =
          formData as SignupForm;

        const {
          data,
          error: signupError,
        } =
          await supabase.auth.signUp(
            {
              email:
                signupData.email,
              password:
                signupData.password,

              options: {
                data: {
                  name:
                    signupData.name,
                  role:
                    signupData.role,
                },
              },
            }
          );

        if (signupError) {
          setError(
            signupError.message
          );
          return;
        }

        if (data.user) {
          const newUser = {
            id: data.user.id,
            email:
              signupData.email,
            name:
              signupData.name,
            role:
              signupData.role,
            created_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          };

          await createUserProfile(
            newUser
          );

          alert(
            'Account created successfully. Please sign in.'
          );

          setIsLogin(true);
          reset();
        }
      }
    } catch (err) {
      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const showPassword = isLogin
    ? showLoginPassword
    : showSignupPassword;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT PANEL */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 lg:flex">

          <div className="absolute inset-0 bg-black/10" />

          <div className="relative z-10 flex flex-col justify-between w-full text-white p-14">

            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 mb-10 border rounded-full bg-white/10 backdrop-blur-md border-white/20">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Secure University Access
                </span>
              </div>

              <h1 className="text-6xl font-black tracking-tight">
                IUGRID
              </h1>

              <p className="mt-5 text-2xl font-semibold text-blue-100">
                AI-Driven Smart Grievance
                Redressal & Decision Support
                System
              </p>

              <p className="max-w-xl mt-6 text-lg leading-8 text-slate-200">
                A secure and intelligent
                grievance platform designed
                for universities with AI-based
                complaint classification,
                tracking, and smart
                decision-making support.
              </p>
            </div>

            <div className="space-y-5">

              {[
                'AI-powered grievance analysis',
                'Smart complaint tracking',
                'Role-based secure dashboards',
                'Real-time grievance insights',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-4 p-4 border rounded-2xl bg-white/10 backdrop-blur-md border-white/10"
                >
                  <Sparkles className="w-5 h-5 text-blue-300" />
                  <span className="text-base font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex items-center justify-center px-5 py-10">

          <div className="w-full max-w-lg">

            {/* Mobile Logo */}
            <div className="mb-8 text-center lg:hidden">
              <h1 className="text-4xl font-black text-blue-700">
                IUGRID
              </h1>

              <p className="mt-2 text-slate-600">
                Smart Grievance
                Redressal System
              </p>
            </div>

            <div className="overflow-hidden bg-white border shadow-xl rounded-[32px] border-slate-200">

              {/* Tabs */}
              <div className="flex p-2 bg-slate-100">
                <button
                  onClick={() =>
                    setIsLogin(true)
                  }
                  className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all ${
                    isLogin
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Sign In
                </button>

                <button
                  onClick={() =>
                    setIsLogin(false)
                  }
                  className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all ${
                    !isLogin
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <div className="p-8">

                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {isLogin
                      ? 'Welcome Back'
                      : 'Create Account'}
                  </h2>

                  <p className="mt-2 text-slate-500">
                    {isLogin
                      ? 'Login to access your dashboard'
                      : 'Register to access IUGRID'}
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(
                    onSubmit
                  )}
                  className="space-y-5"
                >

                  {!isLogin && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-slate-700">
                        Full Name
                      </label>

                      <input
                        type="text"
                        placeholder="Enter your full name"
                        {...register(
                          'name' as never
                        )}
                        className="w-full px-5 py-4 transition border outline-none bg-slate-50 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      {'name' in errors &&
                        errors.name && (
                          <p className="mt-2 text-sm text-red-500">
                            {
                              errors.name
                                .message
                            }
                          </p>
                        )}
                    </div>
                  )}

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700">
                      Email Address
                    </label>

                    <input
                      type="email"
                      placeholder="Enter your email"
                      {...register(
                        'email'
                      )}
                      className="w-full px-5 py-4 transition border outline-none bg-slate-50 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    {errors.email && (
                      <p className="mt-2 text-sm text-red-500">
                        {
                          errors.email
                            .message
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700">
                      Password
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        placeholder="Minimum 6 characters"
                        {...register(
                          'password'
                        )}
                        className="w-full px-5 py-4 transition border outline-none pr-14 bg-slate-50 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          isLogin
                            ? setShowLoginPassword(
                                !showLoginPassword
                              )
                            : setShowSignupPassword(
                                !showSignupPassword
                              )
                        }
                        className="absolute -translate-y-1/2 text-slate-500 right-5 top-1/2 hover:text-blue-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-2 text-sm text-red-500">
                        {
                          errors.password
                            .message
                        }
                      </p>
                    )}
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-slate-700">
                        Role
                      </label>

                      <div className="relative">
                        <select
                          {...register(
                            'role' as never
                          )}
                          className="w-full px-5 py-4 transition border outline-none appearance-none bg-slate-50 rounded-2xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="student">
                            Student
                          </option>

                          <option value="admin">
                            Admin
                          </option>
                        </select>

                        <GraduationCap className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none text-slate-400 right-5 top-1/2" />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 text-sm font-medium text-red-700 border border-red-200 rounded-2xl bg-red-50">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full gap-2 py-4 font-semibold text-white transition-all bg-blue-700 shadow-lg rounded-2xl hover:bg-blue-800 hover:shadow-xl disabled:opacity-50"
                  >
                    {loading
                      ? 'Please wait...'
                      : isLogin
                      ? 'Sign In'
                      : 'Create Account'}

                    {!loading && (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}