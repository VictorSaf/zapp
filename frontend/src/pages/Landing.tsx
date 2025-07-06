import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import FadeIn from '../components/animations/FadeIn';
import { SlideUpCard } from '../components/animations/SlideUp';
import { useAuthStore } from '../stores/authStore';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <FadeIn delay={0.1}>
          <div className="text-center mb-16">
            <motion.h1
              className="text-5xl md:text-6xl font-bold text-primary mb-6"
              animate={{
                textShadow: [
                  '0 0 0px #1a365d',
                  '0 0 30px #1a365d20',
                  '0 0 0px #1a365d',
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              ZAEUS
            </motion.h1>
            
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Asistentul tău AI pentru educație și analiză în trading. 
              Învață, analizează și evoluează cu tehnologii de ultimă generație.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                onClick={handleGetStarted}
                motionProps={{
                  whileHover: { scale: 1.05, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' },
                  whileTap: { scale: 0.95 }
                }}
              >
                {isAuthenticated ? 'Acces Dashboard' : 'Începe acum'}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                motionProps={{
                  whileHover: { scale: 1.05 },
                  whileTap: { scale: 0.95 }
                }}
              >
                Află mai multe
              </Button>
            </motion.div>
          </div>
        </FadeIn>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <SlideUpCard delay={0.2}>
            <div className="bg-background rounded-lg border p-8 text-center h-full">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Agent AI Personal</h3>
              <p className="text-muted-foreground">
                Agent 00Z, asistentul tău personal care înțelege stilul și obiectivele tale de trading.
              </p>
            </div>
          </SlideUpCard>

          <SlideUpCard delay={0.3}>
            <div className="bg-background rounded-lg border p-8 text-center h-full">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Analiză Avansată</h3>
              <p className="text-muted-foreground">
                Analize complexe ale piețelor financiare cu AI hibrid - local și cloud.
              </p>
            </div>
          </SlideUpCard>

          <SlideUpCard delay={0.4}>
            <div className="bg-background rounded-lg border p-8 text-center h-full">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Securitate Totală</h3>
              <p className="text-muted-foreground">
                Conversații encriptate și date protejate. Privacy by design pentru informațiile tale.
              </p>
            </div>
          </SlideUpCard>
        </div>

        {/* Technology Stack */}
        <FadeIn delay={0.6} direction="up">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-primary mb-8">
              Tehnologie de Ultimă Generație
            </h2>
            
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <motion.div
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border"
              >
                <span className="font-mono text-sm">React 19</span>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border"
              >
                <span className="font-mono text-sm">OpenAI GPT</span>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border"
              >
                <span className="font-mono text-sm">Claude AI</span>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border"
              >
                <span className="font-mono text-sm">Ollama</span>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1, opacity: 1 }}
                className="flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border"
              >
                <span className="font-mono text-sm">PostgreSQL</span>
              </motion.div>
            </div>
          </div>
        </FadeIn>

        {/* CTA Section */}
        <FadeIn delay={0.8} direction="up">
          <div className="text-center bg-primary/5 rounded-2xl p-12 border">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Gata să începi călătoria în trading?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Alătură-te comunității ZAEUS și descoperă puterea AI-ului în educația financiară.
            </p>
            
            <Button
              size="lg"
              onClick={handleGetStarted}
              motionProps={{
                whileHover: { 
                  scale: 1.05, 
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' 
                },
                whileTap: { scale: 0.95 }
              }}
            >
              {isAuthenticated ? 'Acces Dashboard' : 'Creează cont gratuit'}
            </Button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default Landing;