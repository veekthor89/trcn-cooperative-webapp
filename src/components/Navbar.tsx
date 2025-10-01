import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
const Navbar = () => {
  const navigate = useNavigate();
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <Shield className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">CoopFinance</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#home" className="text-muted-foreground hover:text-foreground transition-smooth">Home</a>
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">About Us</a>
          <a href="#services" className="text-muted-foreground hover:text-foreground transition-smooth">Services</a>
          <a href="#contact" className="text-muted-foreground hover:text-foreground transition-smooth">Contact</a>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button onClick={() => navigate("/auth?mode=signup")}>
            Get Started
          </Button>
        </div>
      </div>
    </nav>;
};
export default Navbar;