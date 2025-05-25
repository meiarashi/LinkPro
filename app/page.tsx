import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import UserTypes from '../components/landing/UserTypes'
import Faq from '../components/landing/Faq'
import CtaSection from '../components/landing/CtaSection'
import Footer from '../components/landing/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <UserTypes />
      <Faq />
      <CtaSection />
      <Footer />
    </main>
  )
} 