'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DatePicker, { getNextFridayOrSaturday } from './DatePicker';
import ModalWrapper from './ModalWrapper';

interface NewPartyInput {
  title: string;
  host: string;
  pinLabel: string;
  address: string;
  doorsOpen: string;
  category: string;
  date: string;
}

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (party: NewPartyInput) => void;
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const DOOR_TIMES = ['9 PM', '10 PM', '11 PM', '12 AM'];
const CATEGORIES = ['Frat Party', 'House Party', 'House Show', 'Rooftop Party', 'Other'];

export default function AddPartyModal({ isOpen, onClose, onSubmit }: AddPartyModalProps) {
  const [title, setTitle] = useState('');
  const [host, setHost] = useState('');
  const [pinLabel, setPinLabel] = useState('');
  const [address, setAddress] = useState('');
  const [doorsOpen, setDoorsOpen] = useState(DOOR_TIMES[1]); // Default 10 PM
  const [category, setCategory] = useState(CATEGORIES[1]); // Default House Party
  const [date, setDate] = useState(getNextFridayOrSaturday());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setHost('');
      setPinLabel('');
      setAddress('');
      setDoorsOpen(DOOR_TIMES[1]);
      setCategory(CATEGORIES[1]);
      setDate(getNextFridayOrSaturday());
      setErrors({});
    }
  }, [isOpen]);

  // Fetch address suggestions from Nominatim API
  const fetchAddressSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);

    // Add Philadelphia context if not present
    const searchQuery = query.toLowerCase().includes('philadelphia') || query.toLowerCase().includes('phila')
      ? query
      : `${query}, Philadelphia, PA`;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          limit: '5',
          addressdetails: '0',
          bounded: '1',
          viewbox: '-75.20,39.94,-75.10,40.02', // Temple area bounds
        }),
        {
          headers: {
            'User-Agent': 'TemplePartiesApp/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Debounced address input handler
  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
      setShowSuggestions(true);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    // Extract just the street address part (before first comma)
    const streetAddress = suggestion.display_name.split(',')[0];
    setAddress(streetAddress);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

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

    if (!pinLabel.trim()) {
      newErrors.pinLabel = 'Pin label is required';
    } else if (pinLabel.length > 5) {
      newErrors.pinLabel = 'Pin label must be 5 characters or less';
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
      pinLabel: pinLabel.trim(),
      address: address.trim(),
      doorsOpen,
      category,
      date,
    });

    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} className="max-h-[90vh] overflow-y-auto">
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

        {/* Pin Label */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            Map Pin Label <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={pinLabel}
            onChange={(e) => {
              setPinLabel(e.target.value);
              if (errors.pinLabel) setErrors(prev => ({ ...prev, pinLabel: '' }));
            }}
            placeholder="e.g., ΣΧ, OGP, PKP"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
            maxLength={5}
          />
          <p className="text-gray-500 text-xs mt-1">Short label shown on the map pin (max 5 chars)</p>
          {errors.pinLabel && <p className="text-red-400 text-sm mt-1">{errors.pinLabel}</p>}
        </div>

        {/* Address with Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            Address <span className="text-red-400">*</span>
          </label>
          <input
            ref={addressInputRef}
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => {
              if (addressSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Start typing address..."
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors"
            autoComplete="off"
          />

          {/* Loading indicator */}
          {isLoadingSuggestions && (
            <div className="absolute right-4 top-11 text-gray-400">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-700 transition-colors text-white text-sm border-b border-zinc-700 last:border-b-0"
                >
                  <div className="font-medium">{suggestion.display_name.split(',')[0]}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {suggestion.display_name.split(',').slice(1, 3).join(',').trim()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
        </div>

        {/* Date Picker */}
        <DatePicker value={date} onChange={setDate} />

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
    </ModalWrapper>
  );
}
