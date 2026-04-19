import { defineConfig } from 'bunqueue';

export default defineConfig({
  storage: {
    dataPath: './data/queue.db',
  },
});