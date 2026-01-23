'use client';

import { useEffect, useState } from 'react';

interface NewPartyInput {
  title: string;
  host: string;
  address: string;
  doorsOpen: string;
  category: string;
  day: 'friday' | 'saturday';
}

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (party: NewPartyInput) => void;
}

const DOOR_TIMES = ['9 PM', '10 PM', '11 PM', '12 AM'];
const CATEGORIES = ['Frat Party', 'House Party', 'House Show', 'Rooftop Party', 'Other'];

export default function AddPartyModal({ isOpen, onClose, onSubmit }: AddPartyModalProps) {
  const [title, setTitle] = useState('');
  const [host, setHost] = useState('');
  const [address, setAddress] = useState('');
  const [doorsOpen, setDoorsOpen] = useState(DOOR_TIMES[1]); // Default 10 PM
  const [category, setCategory] = useState(CATEGORIES[1]); // Default House Party
  const [day, setDay] = useState<'friday' | 'saturday'>('friday');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setHost('');
      setAddress('');
      setDoorsOpen(DOOR_TIMES[1]);
      setCategory(CATEGORIES[1]);
      setDay('friday');
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 50) {
      newErrors.title = 'Title must be 50 characters or less';
    }

    if (!host.trim()) {
      newErrors.host = 'Host is required';
    } else if (host.length > 30) {
      newErrors.host = 'Host must be 30 characters or less';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      host: host.trim(),
      address: address.trim(),
      doorsOpen,
      category,
      day,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      style={{ zIndex: 10000 }}
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-[#FA4693]/30 border border-[#FA4693]/30 animate-scale-in relative max-h-[90vh] overflow-y-auto">
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

        <h2 className="text-2xl font-semibold text-white mb-6">Add a Party</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              placeholder="e.g., Sigma Chi House Party"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
              maxLength={50}
            />
            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Host */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Host <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => {
                setHost(e.target.value);
                if (errors.host) setErrors(prev => ({ ...prev, host: '' }));
              }}
              placeholder="e.g., Sigma Chi"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
              maxLength={30}
            />
            {errors.host && <p className="text-red-400 text-sm mt-1">{errors.host}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Address <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              placeholder="e.g., 1234 N Broad St"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
            />
            {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* Day Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Day</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDay('friday')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                  day === 'friday'
                    ? 'bg-[#FA4693] text-white shadow-lg shadow-[#FA4693]/30'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                Friday
              </button>
              <button
                type="button"
                onClick={() => setDay('saturday')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-200 ${
                  day === 'saturday'
                    ? 'bg-[#FA4693] text-white shadow-lg shadow-[#FA4693]/30'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                Saturday
              </button>
            </div>
          </div>

          {/* Doors Open */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Doors Open</label>
            <select
              value={doorsOpen}
              onChange={(e) => setDoorsOpen(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.5rem',
              }}
            >
              {DOOR_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.5rem',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-[#FA4693] hover:bg-[#FB6BA8] shadow-lg shadow-[#FA4693]/30 hover:shadow-[#FA4693]/40 transition-all duration-200 active:scale-95 mt-6"
          >
            Add Party
          </button>
        </form>
      </div>
    </div>
  );
}
