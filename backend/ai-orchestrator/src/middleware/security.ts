import helmet from 'helmet';
import config from '@/config';

const securityOptions = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // Frameguard
  frameguard: {
    action: 'deny',
  },
  
  // Hide Powered-By header
  hidePoweredBy: true,
  
  // HSTS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer'],
  },
  
  // X-XSS-Protection
  xssFilter: true,
});

export default securityOptions;