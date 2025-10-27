'use client';

import React, { useState, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';

interface VoiceButtonProps {
  onTranscript: (transcript: string) => void;
  className?: string;
  buttonClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  label?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  className = '',
  buttonClassName = '',
  size = 'md',
  variant = 'icon',
  label = 'Voice input',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const handleTranscript = useCallback((transcript: string) => {
    onTranscript(transcript);
  }, [onTranscript]);

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording);
  }, []);

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${sizeClasses[size]}
            rounded-full transition-all duration-200
            ${isOpen && isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            text-white shadow-sm hover:shadow-md
            ${buttonClassName}
          `}
          aria-label={label}
          title={label}
        >
          {isOpen && isRecording ? (
            <MicOff className={iconSizes[size]} />
          ) : (
            <Mic className={iconSizes[size]} />
          )}
        </button>

        {/* Popover with VoiceRecorder */}
        {isOpen && (
          <div className="absolute z-50 mt-2 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <VoiceRecorder
              onTranscript={handleTranscript}
              onRecordingChange={handleRecordingChange}
              continuous={false}
            />
            <button
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Button variant
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 ${sizeClasses[size]} px-4
          rounded-lg transition-all duration-200
          ${isOpen && isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
          }
          text-white shadow-sm hover:shadow-md
          ${buttonClassName}
        `}
      >
        {isOpen && isRecording ? (
          <>
            <MicOff className={iconSizes[size]} />
            <span className="text-sm font-medium">Recording...</span>
          </>
        ) : (
          <>
            <Mic className={iconSizes[size]} />
            <span className="text-sm font-medium">{label}</span>
          </>
        )}
      </button>

      {/* Modal with VoiceRecorder */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <VoiceRecorder
                onTranscript={handleTranscript}
                onRecordingChange={handleRecordingChange}
                continuous={false}
              />
              <button
                onClick={() => setIsOpen(false)}
                className="mt-4 w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceButton;
