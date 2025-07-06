import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import FadeIn from '../components/animations/FadeIn';

const Dashboard: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                Bine ai revenit, {user?.first_name}!
              </h1>
              <p className="text-muted-foreground">
                Explorează piețele financiare cu ajutorul AI-ului ZAEUS
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              motionProps={{
                whileHover: { scale: 1.05 },
                whileTap: { scale: 0.95 }
              }}
            >
              Ieșire
            </Button>
          </div>
        </FadeIn>

        {/* User Info Card */}
        <FadeIn delay={0.2} direction="up">
          <motion.div
            className="bg-background rounded-lg border shadow-lg p-6 mb-8"
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-4">Profilul tău</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  Informații de bază
                </h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Nume:</span> {user?.first_name} {user?.last_name}</p>
                  <p><span className="font-medium">Email:</span> {user?.email}</p>
                  <p><span className="font-medium">Cont verificat:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      user?.email_verified 
                        ? 'bg-success/10 text-success' 
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {user?.email_verified ? 'Verificat' : 'Neverificat'}
                    </span>
                  </p>
                  <p><span className="font-medium">2FA:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      user?.two_factor_enabled 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {user?.two_factor_enabled ? 'Activat' : 'Dezactivat'}
                    </span>
                  </p>
                </div>
              </div>
              
              {profile && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">
                    Profil trading
                  </h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Experiență:</span> 
                      <span className="capitalize ml-2">{profile.trading_experience}</span>
                    </p>
                    <p><span className="font-medium">Toleranță risc:</span> 
                      <span className="capitalize ml-2">{profile.risk_tolerance}</span>
                    </p>
                    <p><span className="font-medium">Piețe preferate:</span> 
                      <span className="ml-2">{profile.preferred_markets?.join(', ')}</span>
                    </p>
                    <p><span className="font-medium">Temă:</span> 
                      <span className="capitalize ml-2">{profile.theme}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.3} direction="up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/chat')}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                🤖
              </div>
              <h3 className="font-semibold mb-2">Chat cu Agent 00Z</h3>
              <p className="text-sm text-muted-foreground">
                Începe o conversație cu agentul tău personal AI
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/trading')}
            >
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                📊
              </div>
              <h3 className="font-semibold mb-2">Trading Live</h3>
              <p className="text-sm text-muted-foreground">
                Gestionează conturi și execută tranzacții
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/portfolio')}
            >
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                📈
              </div>
              <h3 className="font-semibold mb-2">Portfolio Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Analizează performanța și riscurile portofoliului
              </p>
            </motion.div>
          </div>
        </FadeIn>

        {/* Additional Quick Actions */}
        <FadeIn delay={0.4} direction="up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/strategies')}
            >
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                🎯
              </div>
              <h3 className="font-semibold mb-2">Strategy Builder</h3>
              <p className="text-sm text-muted-foreground">
                Creează și testează strategii de trading
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/market-data')}
            >
              <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4">
                💹
              </div>
              <h3 className="font-semibold mb-2">Market Data</h3>
              <p className="text-sm text-muted-foreground">
                Prețuri real-time și indicatori tehnici
              </p>
            </motion.div>

            <motion.div
              className="bg-background rounded-lg border p-6 text-center cursor-pointer"
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate('/education')}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                📚
              </div>
              <h3 className="font-semibold mb-2">Educație</h3>
              <p className="text-sm text-muted-foreground">
                Materiale educaționale și tutoriale
              </p>
            </motion.div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default Dashboard;