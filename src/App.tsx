import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TestEmail from "./pages/TestEmail";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Network from "./pages/Network";
import InviteLanding from "./pages/InviteLanding";
import InviteLinkLanding from "./pages/InviteLinkLanding";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/network"
            element={
              <ProtectedRoute>
                <Network />
              </ProtectedRoute>
            }
          />
          <Route path="/test-email" element={<TestEmail />} />
          <Route path="/invite/:token" element={<InviteLanding />} />
          <Route path="/invite-link/:token" element={<InviteLinkLanding />} />
          {/* Redirect old invite format to new format */}
          <Route path="/invite/:token" element={<InviteLinkLanding />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
