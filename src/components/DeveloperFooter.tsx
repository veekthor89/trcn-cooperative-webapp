import vanniLogo from "@/assets/vanni-logo.png";

const DeveloperFooter = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm py-2 px-4">
      <a
        href="https://vanni.dev"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit developer's website"
        className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="text-xs">Developed by</span>
        <img
          src={vanniLogo}
          alt="VANNI - Design Build Think"
          className="h-5 md:h-6 w-auto"
        />
      </a>
    </footer>
  );
};

export default DeveloperFooter;
