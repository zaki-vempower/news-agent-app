const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('Available models:', Object.getOwnPropertyNames(prisma).filter(name => {
  return typeof prisma[name] === 'object' && 
         prisma[name] !== null && 
         !name.startsWith('_') && 
         !name.startsWith('$');
}));

console.log('All properties:', Object.getOwnPropertyNames(prisma).filter(name => !name.startsWith('_')));
