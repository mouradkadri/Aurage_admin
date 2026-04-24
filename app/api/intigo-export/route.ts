/**
 * app/api/intigo-export/route.ts
 *
 * POST /api/intigo-export
 * Body: { orders: Order[] }
 *
 * Runs the Python generator server-side, returns the filled .xlsx
 * that matches Intigo's template exactly (all 3 sheets preserved).
 *
 * Place this file at: app/api/intigo-export/route.ts
 * Place generate_intigo_excel.py at: scripts/generate_intigo_excel.py
 * Place template_colis.xlsx at: public/template_colis.xlsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { execFile }  from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join }    from 'path';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const { orders } = await req.json();

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    // Write orders to a temp JSON file the Python script will read
    const tmpJson = join(tmpdir(), `intigo_orders_${Date.now()}.json`);
    const tmpXlsx = join(tmpdir(), `intigo_export_${Date.now()}.xlsx`);

    await writeFile(tmpJson, JSON.stringify(orders));

    // Run the Python generator
    const scriptPath   = join(process.cwd(), 'scripts', 'generate_intigo_excel.py');
    const templatePath = join(process.cwd(), 'public', 'template_colis.xlsx');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    await execFileAsync(pythonCmd, [scriptPath, tmpJson, templatePath, tmpXlsx]);

    // Read the generated file
    const fileBuffer = await readFile(tmpXlsx);

    // Clean up temp files
    await Promise.all([unlink(tmpJson), unlink(tmpXlsx)]).catch(() => {});

    const date     = new Date().toISOString().split('T')[0];
    const filename = `intigo_colis_${date}_${orders.length}cmd.xlsx`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(fileBuffer.length),
      },
    });

  } catch (error) {
    console.error('[intigo-export] Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}