import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { AuthProvider } from './providers/AuthProvider';
import { CommunityProvider } from './providers/CommunityProvider';
import { router } from './router/routes';

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CommunityProvider>
          <RouterProvider router={router} />
        </CommunityProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
