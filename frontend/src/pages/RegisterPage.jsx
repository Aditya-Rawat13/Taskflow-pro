import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { register as registerApi } from '../api/auth.api.js';

function validateForm({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  else if (name.trim().length > 50) errors.name = 'Name must be at most 50 characters.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Z]/.test(password)) errors.password = 'Password must contain at least one uppercase letter.';
  else if (!/[0-9]/.test(password)) errors.password = 'Password must contain at least one number.';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setIsSubmitting(true);
    setServerError('');
    try {
      const data = await registerApi({ name: form.name.trim(), email: form.email, password: form.password });
      login(data.user, data.token);
    } catch (err) {
      setServerError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Get started with TaskFlow Pro</p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">Full name</label>
            <input id="name" name="name" type="text" autoComplete="name" required value={form.name} onChange={handleChange} className={inputClass('name')} placeholder="Jane Smith" />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} className={inputClass('email')} placeholder="you@example.com" />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} className={inputClass('password')} placeholder="Min 8 chars, 1 uppercase, 1 number" />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-1 block">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={handleChange} className={inputClass('confirmPassword')} placeholder="••••••••" />
            {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
