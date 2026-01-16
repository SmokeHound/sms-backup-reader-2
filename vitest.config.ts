import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
		exclude: [
			'src/**/*.component.spec.ts',
			'src/**/app.component.spec.ts'
		],
  },
});
