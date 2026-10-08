import type { Metadata, Viewport } from 'next';
import { Figtree, Fraunces } from 'next/font/google';
import { APP_DESCRIPTION, APP_NAME } from '@/config/app';
import { Toasts } from '@/components/ui/Toasts';
import { PrefsLoader } from '@/components/ui/PrefsLoader';
import { SocialLayer } from '@/components/social/SocialLayer';
import { SettingsOverlay } from '@/components/settings/SettingsOverlay';
import { HomeBackdrop } from '@/components/landing/HomeBackdrop';
import { AppExperience } from '@/components/ui/AppExperience';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'black-translucent' },
  // Listing `apple` alone drops the tab icon Next would otherwise link from app/icon.svg, so name it too.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#061419',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable}`}>
      <body className="antialiased">
        <AppExperience>
        <HomeBackdrop />
        {children}
        <Toasts />
        <PrefsLoader />
        <SocialLayer />
        <SettingsOverlay />
        </AppExperience>
      </body>
    </html>
  );
}
