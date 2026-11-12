// MongoDB를 설치하지 않고 앱을 체험할 때 사용한다: npm run dev:memory
// 메모리 MongoDB를 띄워 MONGODB_URI로 넘기고 next dev를 실행한다. 종료하면 데이터는 사라진다.
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const server = await MongoMemoryServer.create();
const uri = server.getUri('todo-goal-app');
console.log(`[dev:memory] in-memory MongoDB: ${uri}`);

const port = process.env.PORT ?? '3000';
const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, MONGODB_URI: uri },
});

const shutdown = async () => {
  child.kill();
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
child.on('exit', async (code) => {
  await server.stop();
  process.exit(code ?? 0);
});
