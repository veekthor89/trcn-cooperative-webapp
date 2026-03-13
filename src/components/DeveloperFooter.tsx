import vanniLogo from "@/assets/vanni-logo.png";

const DeveloperFooter = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-background py-4 px-4 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
      <a
        href="https://vanni.dev"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit developer's website"
        className="flex items-center justify-center gap-3 text-foreground/70 hover:text-foreground transition-colors">
        
        <span className="text-sm font-medium">Developed by VANNI </span>
        <img

          alt="VANNI - Design Build Think"
          className="h-8 md:h-9 w-auto" src="/lovable-uploads/6d8dc3e3-7a32-4b7d-aaac-3ba804de4562.png" />
        
      </a>
    </footer>);

};

export default DeveloperFooter;