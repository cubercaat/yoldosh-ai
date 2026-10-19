// PM2 bilan doimiy ishlatish: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [{ name: 'chorraha-quizbot', script: 'src/index.js', node_args: '--no-warnings', autorestart: true, max_memory_restart: '400M' }],
};
