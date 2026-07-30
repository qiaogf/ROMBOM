"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/app/actions/authActions";
import { Mail, Lock, User, ArrowRight, Globe } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "US",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<{
    firstName: boolean;
    lastName: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  }>({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const router = useRouter();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string): string => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!formData.firstName.trim()) {
      setError("First name is required");
      setIsLoading(false);
      return;
    }

    if (!formData.lastName.trim()) {
      setError("Last name is required");
      setIsLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      setIsLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError("Password is required");
      setIsLoading(false);
      return;
    }

    const pwdError = validatePassword(formData.password);
    if (pwdError) {
      setError(pwdError);
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country,
      });

      if (result.success) {
        setSuccess("Account created successfully!");
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const firstNameError = touched.firstName && !formData.firstName.trim()
    ? "First name is required"
    : "";

  const lastNameError = touched.lastName && !formData.lastName.trim()
    ? "Last name is required"
    : "";

  const emailError = touched.email && !formData.email.trim()
    ? "Email is required"
    : touched.email && !validateEmail(formData.email)
    ? "Invalid email format"
    : "";

  const passwordError = touched.password && !formData.password.trim()
    ? "Password is required"
    : touched.password ? validatePassword(formData.password)
    : "";

  const confirmPasswordError = touched.confirmPassword && formData.password !== formData.confirmPassword
    ? "Passwords do not match"
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">GlobalShop</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Create Account</h1>
          <p className="text-slate-500 text-lg">Join us and start shopping today</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 shadow-lg shadow-slate-200/50">
          {error && (
            <div className="mb-6 alert-error">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 alert-success">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    onBlur={() => setTouched({ ...touched, firstName: true })}
                    className={`input-field-icon ${
                      firstNameError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                    }`}
                    placeholder="John"
                  />
                </div>
                {firstNameError && (
                  <p className="mt-2 text-sm text-red-500">{firstNameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    onBlur={() => setTouched({ ...touched, lastName: true })}
                    className={`input-field-icon ${
                      lastNameError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                    }`}
                    placeholder="Doe"
                  />
                </div>
                {lastNameError && (
                  <p className="mt-2 text-sm text-red-500">{lastNameError}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  className={`input-field-icon ${
                    emailError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                  placeholder="your@email.com"
                />
              </div>
              {emailError && (
                <p className="mt-2 text-sm text-red-500">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="input-field-icon appearance-none cursor-pointer"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  <option value="CN">China</option>
                  <option value="AU">Australia</option>
                  <option value="SG">Singapore</option>
                  <option value="HK">Hong Kong</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  className={`input-field-icon ${
                    passwordError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                  placeholder="••••••"
                />
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                  className={`input-field-icon ${
                    confirmPasswordError ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                  placeholder="••••••"
                />
              </div>
              {confirmPasswordError && (
                <p className="mt-2 text-sm text-red-500">{confirmPasswordError}</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 mt-1 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                required
              />
              <label htmlFor="terms" className="text-sm text-slate-600">
                I agree to the{" "}
                <Link href="/terms" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-8 py-4"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500">
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}