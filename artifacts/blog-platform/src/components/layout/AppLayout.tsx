import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans">
      <Navbar />
      <main className="flex-1 w-full relative">
        {children}
      </main>
      <footer className="border-t border-border/40 bg-muted/20 py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground font-serif italic text-lg mb-4">Inkwell.</p>
          <p className="text-sm text-muted-foreground/60">
            A sanctuary for considered writing.
          </p>
        </div>
      </footer>
    </div>
  );
}
