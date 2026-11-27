import HomeHero from "@/components/home-hero";
import { AboutSection, ProcessSection } from "@/components/home-content-sections";
import { ServicesSection } from "@/components/services-section";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { ReviewsSection } from "@/components/reviews-section";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <HomeHero />
      <ServicesSection />
      <ProcessSection />
      <AboutSection />
      <ReviewsSection />
      <SiteFooter />
    </main>
  );
}
