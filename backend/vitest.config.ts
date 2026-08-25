import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@config': path.resolve(__dirname, './src/config'),
      '@database': path.resolve(__dirname, './src/database'),
      '@errors': path.resolve(__dirname, './src/errors'),
      '@logger': path.resolve(__dirname, './src/logger'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@validation': path.resolve(__dirname, './src/validation'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});
