import IpadAwareLayout from './IpadAwareLayout';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  isMobile?: boolean;
}

export default function AppLayout({ children, title, isMobile = false }: AppLayoutProps) {
  return (
    <IpadAwareLayout title={title} isMobile={isMobile}>
      {children}
    </IpadAwareLayout>
  );
}
