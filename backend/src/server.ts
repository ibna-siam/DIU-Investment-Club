import { createApp } from './app';
import { env } from './config/env';
import { isSupabaseConfigured } from './config/supabase';
import { rolesRepository } from './modules/roles/roles.repository';
import { usersRepository } from './modules/users/users.repository';
import { automationScheduler } from './modules/automation/automation.scheduler';
import { emailQueue } from './modules/email/email.queue';
import { notificationEventsBridge } from './modules/notifications/notification.events.bridge';
import bcrypt from 'bcryptjs';

const startServer = async () => {
  const app = createApp();

  // Initialize domain notification bridge
  notificationEventsBridge.init();

  // Pre-seed an initial admin if database is fresh
  try {
    const roles = await rolesRepository.findAll();
    const superAdminRole = roles.find((r) => r.slug === 'SUPER_ADMIN');
    
    if (superAdminRole) {
      const existingUsers = await usersRepository.findAll({ limit: 1 });
      if (existingUsers.total === 0) {
        const hash = await bcrypt.hash('Admin@123456', 10);
        const adminProfile = await usersRepository.createProfile({
          id: 'a0000001-0000-0000-0000-000000000001',
          full_name: 'Initial Super Admin',
          email: 'admin@diu-invest.club',
          student_id: 'DIU-ADM-001',
          phone: '+8801700000000',
          status: 'active',
          password_hash: hash,
        });
        await usersRepository.assignRole(adminProfile.id, superAdminRole.id);
        console.log('✅ Initial Super Admin created: admin@diu-invest.club / Admin@123456');
      }
    }
  } catch (err) {
    console.warn('Initial admin seed check note:', err);
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 DIU Investment Club Financial Backend Running!`);
    console.log(`📡 Port: ${env.PORT}`);
    console.log(`🌐 Environment: ${env.NODE_ENV}`);
    console.log(`🔐 Supabase Connected: ${isSupabaseConfigured() ? 'YES' : 'Local Fallback'}`);
    console.log(`🛡️  System: Production Financial Core & Operations Engine`);
    console.log(`🔗 API Base: http://localhost:${env.PORT}/api/v1`);
    console.log(`=======================================================`);

    // Start unified automation & reminder background scheduler
    automationScheduler.start(60000); // 60s periodic evaluations (rules, recurring ops, reminders, sweep)
  });

  const shutdown = async () => {
    console.log('Stopping server gracefully...');
    automationScheduler.stop();
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
