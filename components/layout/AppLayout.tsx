import IpadAwareLayout from './IpadAwareLayout';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <IpadAwareLayout title={title}>
      {children}
    </IpadAwareLayout>
  );
}
