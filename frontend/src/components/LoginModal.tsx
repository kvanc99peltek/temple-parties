'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onShowToast: (message: string) => void;
}

type Step = 'email' | 'sent' | 'username';

export default function LoginModal({ isOpen, onClose, onSuccess, onShowToast }: LoginModalProps) {
  const { sendMagicLink, setUsername, needsUsername } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset state when modal opens, or show username step if needed
  useEffect(() => {
    if (isOpen) {
      if (needsUsername) {
        setStep('username');
      } else {
        setStep('email');
      }
      setEmail('');
      setUsernameInput('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, needsUsername]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await sendMagicLink(email);
    setIsLoading(false);

    if (result.success) {
      setStep('sent');
    } else {
      setError(result.error || 'Something went wrong');
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await setUsername(usernameInput.trim());
    setIsLoading(false);

    if (result.success) {
      onShowToast('Welcome to Temple Parties!');
      onClose();
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to set username');
    }
  };

  const goBack = () => {
    if (step === 'sent') {
      setStep('email');
    }
    setError('');
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['email', 'sent'];
    const currentIndex = steps.indexOf(step);

    if (step === 'username') {
      return null; // No indicator for username-only flow
    }

    return (
      <div className="flex justify-center gap-2 mt-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-[#FA4693]' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      style={{ zIndex: 10000 }}
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-[#FA4693]/30 border border-[#FA4693]/30 animate-scale-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Back button */}
        {step === 'sent' && (
          <button
            onClick={goBack}
            className="absolute top-4 left-4 text-gray-600 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <div className="text-center mb-4">
              <span className="text-5xl">🔐</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center mb-2">
              Log in to Temple Parties
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Use your temple.edu email to continue
            </p>

            <div className="mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="yourname@temple.edu"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#FA4693] hover:bg-[#FB6BA8] shadow-lg shadow-[#FA4693]/30 hover:shadow-[#FA4693]/40 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>

            {renderStepIndicator()}
          </form>
        )}

        {/* Step 2: Check Email */}
        {step === 'sent' && (
          <div>
            <div className="text-center mb-4">
              <span className="text-5xl">📧</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center mb-2">
              Check your email
            </h2>
            <p className="text-gray-400 text-center mb-6">
              We sent a magic link to <span className="text-[#FA4693]">{email}</span>
            </p>
            <p className="text-gray-500 text-center text-sm mb-6">
              Click the link in your email to log in. You can close this modal.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all duration-200 active:scale-95"
            >
              Got it
            </button>

            {renderStepIndicator()}
          </div>
        )}

        {/* Username step (shown after magic link verification) */}
        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit}>
            <div className="text-center mb-4">
              <span className="text-5xl">🎉</span>
            </div>
            <h2 className="text-2xl font-semibold text-white text-center mb-2">
              Choose your username
            </h2>
            <p className="text-gray-400 text-center mb-6">
              This is how others will see you
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setError('');
                }}
                placeholder="Enter a username"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !usernameInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#FA4693] hover:bg-[#FB6BA8] shadow-lg shadow-[#FA4693]/30 hover:shadow-[#FA4693]/40 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Complete Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
