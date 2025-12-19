module.exports = {
  title: "adq-audience",
  script: "server-linux-x64",
  interpreter: "none",
  instances: "1",
  exec_mode: "fork",
  env: {
    NODE_ENV: "production",
  },
  // 优雅重启配置
  kill_timeout: 5000, // 等待 5 秒后强制杀死
  wait_ready: true, // 等待服务就绪
  listen_timeout: 3000, // 超时时间
};