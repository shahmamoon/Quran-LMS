import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { Routes, Route, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Marketing pages only — no LMS imports (avoids CSS imports that break the SSR build)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import Booking from './pages/Booking';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

function PublicShell() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow"><Outlet /></main>
      <Footer />
    </div>
  );
}

function MarketingRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/"         element={<Home />} />
        <Route path="/about"    element={<About />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/programs/:slug" element={<ProgramDetail />} />
        <Route path="/book"     element={<Booking />} />
        <Route path="/faq"      element={<FAQ />} />
        <Route path="/privacy"  element={<Privacy />} />
        <Route path="/terms"    element={<Terms />} />
      </Route>
    </Routes>
  );
}

export function render(url: string) {
  const helmetContext: Record<string, unknown> = {};
  const queryClient = new QueryClient();

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={url}>
          <MarketingRoutes />
        </StaticRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );

  queryClient.clear();

  const { helmet } = helmetContext as { helmet: {
    title:  { toString(): string };
    meta:   { toString(): string };
    link:   { toString(): string };
    script: { toString(): string };
  }};

  return { html, helmet };
}
