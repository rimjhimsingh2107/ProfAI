import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, TrendingUp, Clock, Target, Star, 
  BarChart3, MessageSquare, Volume2 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgSessionTime: 0,
    conceptsMastered: 0,
    currentStreak: 0,
    weakAreas: [] as string[],
    strongAreas: [] as string[]
  });

  useEffect(() => {
    // Load user statistics
    if (currentUser) {
      setStats({
        totalSessions: currentUser.learningProfile.totalInteractions,
        avgSessionTime: currentUser.learningProfile.averageSessionDuration,
        conceptsMastered: currentUser.learningProfile.masteredConcepts.length,
        currentStreak: 5, // Mock data
        weakAreas: currentUser.learningProfile.difficultConcepts,
        strongAreas: currentUser.learningProfile.masteredConcepts
      });
    }
  }, [currentUser]);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    description, 
    color = "from-purple-400 to-pink-400" 
  }: {
    icon: any;
    title: string;
    value: string | number;
    description: string;
    color?: string;
  }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="glassmorphism rounded-2xl p-6 border border-white/20"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-lg font-semibold text-white/90 mb-1">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Learning Dashboard
          </motion.h1>
          <p className="text-white/70 text-lg">
            Track your AI learning journey with {currentUser?.displayName || 'ProfAI'}
          </p>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={MessageSquare}
            title="Total Sessions"
            value={stats.totalSessions}
            description="Learning conversations"
            color="from-blue-400 to-cyan-400"
          />
          <StatCard
            icon={Clock}
            title="Avg Session"
            value={`${Math.round(stats.avgSessionTime)}min`}
            description="Time per session"
            color="from-green-400 to-emerald-400"
          />
          <StatCard
            icon={Target}
            title="Concepts Mastered"
            value={stats.conceptsMastered}
            description="Topics you've learned"
            color="from-purple-400 to-pink-400"
          />
          <StatCard
            icon={Star}
            title="Current Streak"
            value={`${stats.currentStreak} days`}
            description="Learning consistency"
            color="from-yellow-400 to-orange-400"
          />
        </div>

        {/* Learning Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glassmorphism rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-2" />
              Learning Profile
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Learning Style</label>
                <div className="text-white font-semibold capitalize">
                  {currentUser?.learningProfile.preferredLearningStyle || 'Mixed'}
                </div>
              </div>
              
              <div>
                <label className="text-white/80 text-sm mb-2 block">Conceptual Understanding</label>
                <div className="flex items-center">
                  <div className="flex-1 bg-white/20 rounded-full h-2 mr-3">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full"
                      style={{
                        width: `${(currentUser?.learningProfile.conceptualUnderstanding || 5) * 10}%`
                      }}
                    />
                  </div>
                  <span className="text-white/80 text-sm">
                    {currentUser?.learningProfile.conceptualUnderstanding || 5}/10
                  </span>
                </div>
              </div>              
              <div>
                <label className="text-white/80 text-sm mb-2 block">Practical Skills</label>
                <div className="flex items-center">
                  <div className="flex-1 bg-white/20 rounded-full h-2 mr-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full"
                      style={{
                        width: `${(currentUser?.learningProfile.practicalSkills || 5) * 10}%`
                      }}
                    />
                  </div>
                  <span className="text-white/80 text-sm">
                    {currentUser?.learningProfile.practicalSkills || 5}/10
                  </span>
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Preferred Pace</label>
                <div className="text-white font-semibold capitalize">
                  {currentUser?.learningProfile.preferredPace || 'Medium'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Topics Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glassmorphism rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2" />
              Progress Overview
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-white/90 font-semibold mb-3 flex items-center">
                  <Star className="w-4 h-4 mr-2 text-green-400" />
                  Mastered Concepts ({stats.strongAreas.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.strongAreas.slice(0, 6).map((concept, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-500/20 text-green-200 rounded-full text-sm border border-green-400/30"
                    >
                      {concept}
                    </span>
                  ))}
                  {stats.strongAreas.length > 6 && (
                    <span className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-sm">
                      +{stats.strongAreas.length - 6} more
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-white/90 font-semibold mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-yellow-400" />
                  Areas for Improvement ({stats.weakAreas.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.weakAreas.slice(0, 4).map((concept, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-500/20 text-yellow-200 rounded-full text-sm border border-yellow-400/30"
                    >
                      {concept}
                    </span>
                  ))}
                  {stats.weakAreas.length > 4 && (
                    <span className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-sm">
                      +{stats.weakAreas.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glassmorphism rounded-2xl p-6 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-400/30 text-left"
            >
              <MessageSquare className="w-6 h-6 text-blue-300 mb-2" />
              <h3 className="text-white font-semibold mb-1">Start New Session</h3>
              <p className="text-white/60 text-sm">Continue your learning journey</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-400/30 text-left"
            >
              <BarChart3 className="w-6 h-6 text-green-300 mb-2" />
              <h3 className="text-white font-semibold mb-1">Review Progress</h3>
              <p className="text-white/60 text-sm">See detailed analytics</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-400/30 text-left"
            >
              <Volume2 className="w-6 h-6 text-purple-300 mb-2" />
              <h3 className="text-white font-semibold mb-1">Voice Settings</h3>
              <p className="text-white/60 text-sm">Customize audio preferences</p>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
