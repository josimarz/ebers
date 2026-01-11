/**
 * @jest-environment node
 */
import { POST } from '@/app/api/backup/route';
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Mock do fs
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    copyFile: jest.fn(),
  },
}));

// Mock do path
jest.mock('path', () => ({
  join: jest.fn(),
}));

// Mock do process.cwd
const mockCwd = jest.fn();
Object.defineProperty(process, 'cwd', {
  value: mockCwd,
});

describe('Backup API Route', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCwd.mockReturnValue('/test/project');
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  test('returns error when destination path is not provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Pasta de destino não informada');
  });

  test('returns error when database file does not exist', async () => {
    mockFs.access.mockRejectedValue(new Error('File not found'));

    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({ destinationPath: '/test/backup' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Arquivo do banco de dados não encontrado');
  });

  test('successfully creates backup when database exists', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({ destinationPath: '/test/backup' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.fileName).toMatch(/^ebers-\d{8}T\d{6}\.db$/);
    expect(data.filePath).toContain('/test/backup');
    expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
  });

  test('returns error when copy operation fails', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockRejectedValue(new Error('Permission denied'));

    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({ destinationPath: '/test/backup' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Erro interno do servidor');
  });

  test('generates correct backup filename format', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    // Mock da data para ter um timestamp previsível
    const mockDate = new Date('2026-01-11T14:39:24.000Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({ destinationPath: '/test/backup' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.fileName).toBe('ebers-20260111T143924.db');
    
    // Restaurar Date original
    (global.Date as any).mockRestore();
  });

  test('calls copyFile with correct paths', async () => {
    mockFs.access.mockResolvedValue(undefined);
    mockFs.copyFile.mockResolvedValue(undefined);

    const destinationPath = '/test/backup/folder';
    const request = new NextRequest('http://localhost:3000/api/backup', {
      method: 'POST',
      body: JSON.stringify({ destinationPath }),
    });

    await POST(request);

    expect(mockPath.join).toHaveBeenCalledWith('/test/project', 'prisma', 'dev.db');
    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '/test/project/prisma/dev.db',
      expect.stringContaining('/test/backup/folder/ebers-')
    );
  });
});