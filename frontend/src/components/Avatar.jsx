import React from 'react';

// Custom inline SVG avatars for seamless, premium visual experience without external image dependencies
const AVATAR_MAP = {
  avatar1: {
    name: 'Indigo Developer',
    color: '#6366F1',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar1-grad)" />
        <circle cx="50" cy="40" r="18" fill="white" fillOpacity="0.9" />
        <path d="M22 78C22 62.536 34.536 50 50 50C65.464 50 78 62.536 78 78" stroke="white" strokeWidth="6" strokeLinecap="round" />
        <rect x="42" y="32" width="16" height="6" rx="3" fill="#1E1B4B" />
        <defs>
          <linearGradient id="avatar1-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar2: {
    name: 'Emerald Geek',
    color: '#10B981',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar2-grad)" />
        <circle cx="50" cy="42" r="18" fill="white" fillOpacity="0.9" />
        <path d="M25 76C25 63.5 35 53 50 53C65 53 75 63.5 75 76" fill="white" fillOpacity="0.9" />
        <rect x="35" y="38" width="12" height="8" rx="2" fill="none" stroke="#065F46" strokeWidth="2.5" />
        <rect x="53" y="38" width="12" height="8" rx="2" fill="none" stroke="#065F46" strokeWidth="2.5" />
        <line x1="47" y1="42" x2="53" y2="42" stroke="#065F46" strokeWidth="2.5" />
        <defs>
          <linearGradient id="avatar2-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar3: {
    name: 'Rose Gamer',
    color: '#F43F5E',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar3-grad)" />
        <circle cx="50" cy="40" r="16" fill="white" fillOpacity="0.9" />
        <path d="M24 75C24 62 34 52 50 52C66 52 76 62 76 75" stroke="white" strokeWidth="5" />
        <path d="M30 36C30 30 70 30 70 36V44C70 44 65 48 50 48C35 48 30 44 30 44V36Z" fill="#881337" />
        <circle cx="38" cy="40" r="3" fill="#FDA4AF" />
        <circle cx="62" cy="40" r="3" fill="#FDA4AF" />
        <defs>
          <linearGradient id="avatar3-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F43F5E" />
            <stop offset="1" stopColor="#E11D48" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar4: {
    name: 'Amber Robot',
    color: '#F59E0B',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar4-grad)" />
        <rect x="32" y="28" width="36" height="28" rx="6" fill="white" fillOpacity="0.9" />
        <rect x="42" y="56" width="16" height="8" fill="white" fillOpacity="0.9" />
        <rect x="25" y="64" width="50" height="16" rx="4" fill="white" fillOpacity="0.9" />
        <circle cx="42" cy="42" r="4" fill="#78350F" />
        <circle cx="58" cy="42" r="4" fill="#78350F" />
        <line x1="50" y1="14" x2="50" y2="28" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="14" r="4" fill="white" />
        <defs>
          <linearGradient id="avatar4-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar5: {
    name: 'Sky Astronaut',
    color: '#0EA5E9',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar5-grad)" />
        <circle cx="50" cy="45" r="24" fill="white" fillOpacity="0.9" />
        <rect x="34" y="32" width="32" height="22" rx="10" fill="#0C4A6E" />
        <rect x="38" y="36" width="24" height="14" rx="7" fill="#38BDF8" />
        <rect x="26" y="70" width="48" height="12" rx="6" fill="white" fillOpacity="0.9" />
        <circle cx="44" cy="41" r="2" fill="white" />
        <defs>
          <linearGradient id="avatar5-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar6: {
    name: 'Violet Ninja',
    color: '#8B5CF6',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar6-grad)" />
        <circle cx="50" cy="40" r="18" fill="#2E1065" />
        <rect x="32" y="36" width="36" height="10" fill="#F5F3FF" />
        <circle cx="42" cy="41" r="2.5" fill="#2E1065" />
        <circle cx="58" cy="41" r="2.5" fill="#2E1065" />
        <path d="M22 76C22 61 34 50 50 50C66 50 78 61 78 76" fill="#2E1065" />
        <defs>
          <linearGradient id="avatar6-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar7: {
    name: 'Crimson Wizard',
    color: '#EF4444',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar7-grad)" />
        <circle cx="50" cy="45" r="16" fill="white" fillOpacity="0.9" />
        <path d="M26 78C26 64 36 54 50 54C64 54 74 64 74 78" stroke="white" strokeWidth="5" />
        <path d="M50 14L24 38H76L50 14Z" fill="#7F1D1D" />
        <circle cx="50" cy="14" r="4" fill="#FCA5A5" />
        <defs>
          <linearGradient id="avatar7-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EF4444" />
            <stop offset="1" stopColor="#DC2626" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  avatar8: {
    name: 'Teal Hacker',
    color: '#14B8A6',
    svg: (className) => (
      <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="url(#avatar8-grad)" />
        <circle cx="50" cy="40" r="18" fill="#042F2E" />
        <path d="M22 78C22 62 34 50 50 50C66 50 78 62 78 78" fill="#042F2E" />
        <path d="M30 38H70" stroke="#14B8A6" strokeWidth="4" strokeLinecap="round" />
        <text x="35" y="43" fill="#14B8A6" fontSize="7" fontWeight="bold" fontFamily="monospace">&lt;/&gt;</text>
        <defs>
          <linearGradient id="avatar8-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0D9488" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
};

export const avatarsList = Object.keys(AVATAR_MAP).map((key) => ({
  id: key,
  name: AVATAR_MAP[key].name,
  color: AVATAR_MAP[key].color,
}));

const Avatar = ({ name, className = 'w-10 h-10' }) => {
  const avatarKey = name in AVATAR_MAP ? name : 'avatar1';
  return AVATAR_MAP[avatarKey].svg(className);
};

export default Avatar;
