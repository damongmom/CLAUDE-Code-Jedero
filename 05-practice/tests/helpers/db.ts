import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDB, disconnectDB } from '@/lib/mongodb';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';

/** 테스트 파일마다 독립된 메모리 MongoDB를 띄운다. */
export function useTestDB() {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri('todo-goal-test');
    await connectDB();
    // unique 인덱스가 실제로 만들어진 뒤에 중복 검사를 테스트해야 한다.
    await Promise.all([GoalModel.init(), WeeklyPlanModel.init(), TodoModel.init()]);
  });

  afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await disconnectDB();
    await server?.stop();
  });
}
