import { RouterProvider } from 'react-router-dom';
import { I18nProvider } from './providers/I18nProvider';
import { router } from './router/routes';

export function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
