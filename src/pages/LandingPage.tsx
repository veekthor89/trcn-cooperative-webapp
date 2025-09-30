import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { PiggyBank, Shield, TrendingUp, Users, ArrowRight, Check } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: PiggyBank,
      title: "Smart Savings",
      description: "Set goals, track progress, and watch your money grow with our intelligent savings tools.",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Bank-level security protecting your financial data and transactions 24/7.",
    },
    {
      icon: TrendingUp,
      title: "Flexible Loans",
      description: "Access various loan types with competitive rates tailored to your needs.",
    },
    {
      icon: Users,
      title: "Community First",
      description: "Built for cooperative societies, by people who understand your unique requirements.",
    },
  ];

  const benefits = [
    "Instant access to your financial dashboard",
    "Real-time transaction tracking",
    "Multiple savings goals management",
    "Easy loan application process",
    "Transparent fee structure",
    "Dedicated member support",
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 gradient-hero">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Financial Future, Simplified
              </h1>
              <p className="text-xl mb-8 text-white/90">
                Empowering cooperative societies with modern financial management tools. 
                Save smarter, borrow easier, and grow together.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white/10"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <img 
                src={heroImage} 
                alt="Financial cooperation" 
                className="rounded-2xl shadow-elevated"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground">
              Powerful features designed for cooperative financial management
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="shadow-card hover:shadow-elevated transition-smooth">
                <CardContent className="pt-6">
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Why Choose CoopFinance?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of members who trust us with their financial journey. 
                Experience the difference of a platform built specifically for cooperative societies.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-secondary/10 rounded-full">
                      <Check className="h-4 w-4 text-secondary" />
                    </div>
                    <p className="text-lg">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">5K+</div>
                  <p className="text-muted-foreground">Active Members</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-secondary mb-2">$2M+</div>
                  <p className="text-muted-foreground">Total Savings</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-accent mb-2">98%</div>
                  <p className="text-muted-foreground">Satisfaction Rate</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-primary-glow mb-2">24/7</div>
                  <p className="text-muted-foreground">Support Available</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join your cooperative society's financial revolution today. 
              It's free to start and takes less than 2 minutes.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 CoopFinance. Empowering cooperative societies.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
