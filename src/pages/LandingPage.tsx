import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { PiggyBank, Shield, TrendingUp, Home, Lock, Zap, Users, Award, ArrowRight, Building2 } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const LandingPage = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: PiggyBank,
      title: "Savings",
      description: "Save to hit money goals with no hassle. We keep it safe and help it grow.",
      color: "bg-green-50 dark:bg-green-950/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      icon: TrendingUp,
      title: "Loans",
      description: "Get fast cash without stress. Apply easy and get your loan in no time.",
      color: "bg-pink-50 dark:bg-pink-950/30",
      iconColor: "text-pink-600 dark:text-pink-400",
    },
    {
      icon: Award,
      title: "Investments",
      description: "Grow your wealth with smart moves. Safe choices that make you more cash.",
      color: "bg-purple-50 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: Building2,
      title: "Real Estate",
      description: "Get property with no drama. We link you to legit real estate deals.",
      color: "bg-orange-50 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  const benefits = [
    {
      icon: Lock,
      title: "Trust",
      description: "Your money's locked down tight. We're safe and secure.",
    },
    {
      icon: Users,
      title: "Community",
      description: "We're all here for each other. Growing together.",
    },
    {
      icon: Zap,
      title: "Personalized",
      description: "Made to fit your goals. Financial plans just for you.",
    },
    {
      icon: Shield,
      title: "Transparency",
      description: "No hidden fees or surprises. Everything's clear and honest.",
    },
  ];

  const executives = [
    {
      name: "John Okoro",
      role: "CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    },
    {
      name: "Aisha Ibrahim",
      role: "COO",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    },
    {
      name: "Chidi Eze",
      role: "CFO",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    },
    {
      name: "Amaka Okafor",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
    },
  ];

  const news = [
    {
      title: "New Cooperative Benefits",
      description: "Discover the latest benefits available to all cooperative members this quarter.",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400",
      date: "March 15, 2025",
    },
    {
      title: "Financial Planning Workshop",
      description: "Join our expert-led workshop on building sustainable wealth for your future.",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
      date: "March 10, 2025",
    },
    {
      title: "Investment Opportunities",
      description: "Explore new real estate investment opportunities now available to members.",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400",
      date: "March 5, 2025",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                The smarter way to save, get quick funding and invest without tedious{" "}
                <span className="text-primary">PAPER WORK</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of members building wealth together through our modern cooperative platform.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth?mode=signup")}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="hidden lg:block relative">
              <div className="rounded-2xl overflow-hidden shadow-elevated border-8 border-white dark:border-gray-800">
                <img 
                  src={heroImage} 
                  alt="Financial cooperation" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Partners */}
          <div className="mt-20 text-center">
            <p className="text-sm text-muted-foreground mb-6">Our Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold">Sterling</div>
              <div className="text-2xl font-bold">Cowrywise</div>
              <div className="text-2xl font-bold">FCMB</div>
              <div className="text-2xl font-bold">Unity Bank</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              The smartest way to build sustainable<br />wealth and lifestyle
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We help you achieve your financial goals with our comprehensive suite of services
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Card key={service.title} className={`${service.color} border-0 shadow-card hover:shadow-elevated transition-smooth`}>
                <CardContent className="pt-8 pb-6">
                  <div className={`mb-4 p-3 rounded-lg w-fit ${service.iconColor}`}>
                    <service.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-4">
            <p className="text-sm text-primary font-semibold mb-2">Cooperative members</p>
            <h2 className="text-4xl font-bold mb-16">CoopFinance's got your back</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Meet the <span className="italic">Execs</span>
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {executives.map((exec) => (
              <div key={exec.name} className="text-center">
                <div className="mb-4 rounded-full overflow-hidden w-32 h-32 mx-auto shadow-elevated border-4 border-background">
                  <img 
                    src={exec.image} 
                    alt={exec.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-bold mb-1">{exec.name}</h3>
                <p className="text-sm text-muted-foreground">{exec.role}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="default">See All</Button>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-bold">News & Announcement</h2>
            <Button variant="default">View More</Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((item) => (
              <Card key={item.title} className="overflow-hidden shadow-card hover:shadow-elevated transition-smooth">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-2">{item.date}</p>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <Button variant="default" size="sm">Read More</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-4 gradient-hero text-white">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Track your finances<br />in real time
              </h2>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>View all transactions instantly</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Monitor your savings goals progress</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Track loan repayments and schedules</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span>Access detailed financial reports</span>
                </li>
              </ul>
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Get Started
              </Button>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800" 
                  alt="Dashboard preview"
                  className="rounded-2xl shadow-elevated"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h2 className="text-4xl font-bold">Get Financial Freedom</h2>
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
              <div className="text-left">
                <div className="text-xs font-semibold">256-BIT SSL</div>
                <div className="text-xs text-muted-foreground">SECURED</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">CoopFinance</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-smooth">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Press</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-smooth">Savings</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Loans</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Investments</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-smooth">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-smooth">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>info@coopfinance.com</li>
                <li>+234 800 000 0000</li>
                <li>Lagos, Nigeria</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 CoopFinance. All rights reserved. Empowering cooperative societies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
