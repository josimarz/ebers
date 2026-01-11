import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { destinationPath } = await request.json();

    if (!destinationPath) {
      return NextResponse.json(
        { success: false, error: 'Pasta de destino não informada' },
        { status: 400 }
      );
    }

    // Caminho do banco de dados atual
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    // Verificar se o arquivo do banco existe
    try {
      await fs.access(dbPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Arquivo do banco de dados não encontrado' },
        { status: 404 }
      );
    }

    // Gerar nome do arquivo de backup com timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', 'T');
    
    const backupFileName = `ebers-${timestamp}.db`;
    const backupPath = path.join(destinationPath, backupFileName);

    // Copiar o arquivo do banco para o destino
    await fs.copyFile(dbPath, backupPath);

    return NextResponse.json({
      success: true,
      fileName: backupFileName,
      filePath: backupPath
    });

  } catch (error) {
    console.error('Erro ao criar backup:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}