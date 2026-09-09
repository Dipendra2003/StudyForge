import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../server/utils/spacedRepetition';
import { sanitizeString, sanitizeEmail, sanitizeUsername } from '../server/config/security';
import { authService } from '../server/services/auth.service';
import { registerSchema, loginSchema } from '../shared/schema';

describe('SM-2 Spaced Repetition Algorithm', () => {
  it('should reset repetitions and set interval to 1 on failure (quality < 3)', () => {
    const result = calculateSM2(1, 10, 250, 4);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    // easeFactor is stored as integer * 100 (250 = 2.50)
    expect(result.easeFactor).toBeLessThan(250);
  });

  it('should advance interval to 1 on first successful repetition', () => {
    const result = calculateSM2(4, 1, 250, 0);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
  });

  it('should advance interval to 6 on second successful repetition', () => {
    const result = calculateSM2(4, 1, 250, 1);
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
  });

  it('should multiply interval by ease factor on subsequent successful repetitions', () => {
    const result = calculateSM2(5, 6, 250, 2);
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBeGreaterThanOrEqual(15);
  });

  it('should not let ease factor drop below 130 (1.30)', () => {
    let ef = 140;
    for (let i = 0; i < 5; i++) {
      const res = calculateSM2(0, 1, ef, 0);
      ef = res.easeFactor;
    }
    const finalResult = calculateSM2(0, 1, ef, 0);
    expect(finalResult.easeFactor).toBeGreaterThanOrEqual(130);
  });
});

describe('Security & Sanitization', () => {
  it('should sanitize HTML characters to prevent XSS', () => {
    const malicious = '<script>alert("xss")</script>';
    const cleaned = sanitizeString(malicious);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).toContain('&lt;script&gt;');
  });

  it('should clean and validate email addresses', () => {
    expect(sanitizeEmail('  USER@Domain.COM  ')).toBe('user@domain.com');
    expect(sanitizeEmail('invalid-email-string')).toBe('');
  });

  it('should sanitize usernames and remove invalid characters', () => {
    const cleaned = sanitizeUsername('  student_99!@#  ');
    expect(cleaned).toBe('student_99');
  });
});

describe('Auth Validation & Password Policies', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const validation = authService.validatePasswordStrength('Short1!');
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should reject passwords missing uppercase letters', () => {
    const validation = authService.validatePasswordStrength('weakpassword123');
    expect(validation.valid).toBe(false);
  });

  it('should accept strong passwords meeting all criteria', () => {
    const validation = authService.validatePasswordStrength('StrongPassw0rd!');
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('should validate registration schema correctly', () => {
    const valid = registerSchema.safeParse({
      username: 'test_student',
      email: 'student@studyforge.edu',
      password: 'SecurePassword123!',
      fullName: 'Test Student',
    });
    expect(valid.success).toBe(true);

    const invalid = registerSchema.safeParse({
      username: '',
      email: 'not-an-email',
      password: '123',
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate login schema correctly', () => {
    const valid = loginSchema.safeParse({
      identifier: 'student@studyforge.edu',
      password: 'SecurePassword123!',
    });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({
      identifier: '',
      password: '',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('QuotaStore & In-Memory / Redis Fallback', () => {
  it('should generate valid quota keys with hourly windowing', async () => {
    const { DynamicQuotaStore, InMemoryQuotaStore } = await import('../server/services/quota-store');
    const key = DynamicQuotaStore.generateKey(42);
    expect(key).toMatch(/^ai_quota:42:\d+$/);
    expect(InMemoryQuotaStore.generateKey(42)).toBe(key);
  });

  it('should store, retrieve, increment and delete quota entries', async () => {
    const { quotaStore } = await import('../server/services/quota-store');
    const testKey = `test_quota_${Date.now()}`;
    
    // Initially null
    const initial = await quotaStore.get(testKey);
    expect(initial).toBeNull();

    // Set entry
    await quotaStore.set(testKey, { count: 1, windowStart: Date.now() }, 5000);
    const retrieved = await quotaStore.get(testKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.count).toBe(1);

    // Increment entry
    const newCount = await quotaStore.increment(testKey, 5000);
    expect(newCount).toBe(2);

    // Delete entry
    await quotaStore.delete(testKey);
    const deleted = await quotaStore.get(testKey);
    expect(deleted).toBeNull();
  });
});

describe('QuizCacheService LRU & In-Memory / Redis Support', () => {
  it('should cache, retrieve, and evict quiz items', async () => {
    const { QuizCacheService } = await import('../server/services/quiz-cache-service');
    const cache = new QuizCacheService({ maxSize: 2, ttlMs: 10000 });

    const dummyQuestions: any = [
      { id: 1, question: 'What is TypeScript?', type: 'mcq', correctAnswer: 'A superset of JS', options: ['A superset of JS', 'A style sheet'] }
    ];

    cache.setCacheEntry('key1', dummyQuestions);
    cache.setCacheEntry('key2', dummyQuestions);

    expect(cache.getCacheEntry('key1')).not.toBeNull();
    expect(cache.getStats().hits).toBe(1);

    // Adding 3rd item should trigger LRU eviction (key2 was least recently accessed)
    cache.setCacheEntry('key3', dummyQuestions);
    expect(cache.size).toBeLessThanOrEqual(2);

    await cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.getCacheEntry('key1')).toBeNull();
  });
});

describe('DevOps & Disaster Recovery Verification', () => {
  it('should have executable backup and restore scripts', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const backupScript = path.resolve(__dirname, '../scripts/backup-db.sh');
    const restoreScript = path.resolve(__dirname, '../scripts/restore-db.sh');

    expect(fs.existsSync(backupScript)).toBe(true);
    expect(fs.existsSync(restoreScript)).toBe(true);

    const backupContent = fs.readFileSync(backupScript, 'utf8');
    expect(backupContent).toContain('pg_dump');
    expect(backupContent).toContain('gzip');
    expect(backupContent).toContain('RETENTION_DAYS');

    const restoreContent = fs.readFileSync(restoreScript, 'utf8');
    expect(restoreContent).toContain('psql');
    expect(restoreContent).toContain('gunzip');
  });
});

describe('CI/CD Pipeline Quality Gate Verification', () => {
  it('should enforce test-and-lint gate before building containers in main-ci-cd.yml', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const ciFile = path.resolve(__dirname, '../.github/workflows/main-ci-cd.yml');
    expect(fs.existsSync(ciFile)).toBe(true);

    const ciContent = fs.readFileSync(ciFile, 'utf8');
    expect(ciContent).toContain('test-and-lint:');
    expect(ciContent).toContain('npm run check');
    expect(ciContent).toContain('npm test');
  });
});
