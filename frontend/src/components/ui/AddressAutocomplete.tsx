'use client';

/**
 * AddressAutocomplete — the address input with live suggestions, shared by
 * the create-party form and the become-host application (one implementation,
 * so the two forms can never drift).
 *
 * Typing (3+ chars, debounced 300ms) queries our backend's address-suggest
 * proxy — the browser can't call Nominatim directly (403s without a proper
 * User-Agent), so the API does it for us. Picking a suggestion hands the
 * caller the full label AND its lat/lng; plain typing just updates the text
 * (callers that care about coordinates should invalidate them on type —
 * the text no longer matches a verified pin).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { partiesApi } from '@/services/api';

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  /** Fires on every keystroke with the raw text. */
  onChange: (value: string) => void;
  /** Fires when a suggestion is picked — full label + coordinates. */
  onSelect: (address: string, coords: { lat: number; lng: number }) => void;
  placeholder?: string;
  /** Style the input like the surrounding form. */
  inputClassName?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing address…',
  inputClassName = '',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await partiesApi.suggestAddresses(query);
      setSuggestions(
        data.map((row) => ({
          display_name: row.display_name,
          lat: String(row.lat),
          lon: String(row.lon),
        })),
      );
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (next: string) => {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(next);
      setShow(true);
    }, 300);
  };

  // Tap/click anywhere outside closes the dropdown.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [show]);

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShow(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-temple-surface-2 border border-white/10 rounded-[14px] shadow-xl shadow-black/50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              onClick={() => {
                onSelect(suggestion.display_name, {
                  lat: Number(suggestion.lat),
                  lng: Number(suggestion.lon),
                });
                setShow(false);
                setSuggestions([]);
              }}
              className="w-full text-left px-4 py-3 hover:bg-white/5 text-white text-sm font-montserrat border-b border-white/5 last:border-b-0 transition-colors"
            >
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
