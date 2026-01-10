"use client";

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PatientPhotoProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'large';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  large: 'w-32 h-32'
};

export function PatientPhoto({ 
  src, 
  alt, 
  size = 'md', 
  className 
}: PatientPhotoProps) {
  const [imageError, setImageError] = useState(false);
  
  // Show fallback if no src provided or image failed to load
  const showFallback = !src || imageError;
  
  if (showFallback) {
    return (
      <div 
        className={cn(
          'rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium',
          sizeClasses[size],
          className
        )}
        title={alt}
        data-testid="patient-photo-fallback"
      >
        <span className="text-xs">
          {alt.split(' ').map(name => name.charAt(0)).join('').slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('rounded-full overflow-hidden', sizeClasses[size], className)}>
      <Image
        src={src}
        alt={alt}
        width={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : size === 'xl' ? 96 : 128}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : size === 'xl' ? 96 : 128}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        data-testid="patient-photo-image"
      />
    </div>
  );
}