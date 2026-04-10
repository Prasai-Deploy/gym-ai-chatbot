import express from 'express';
import db from './db.js';

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    let tables = [];
    try {
        const [tableRows] = await db.query("SHOW TABLES");
        tables = tableRows.map(t => ({ name: Object.values(t)[0] }));
    } catch (e) {
        console.error("Failed to fetch tables:", e);
    }

    let html = `
    <html>
      <head>
        <title>gym.db Editor PRO</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f4f4f5; color: #18181b; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th, td { border: 1px solid #e4e4e7; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f4f4f5; font-weight: 600; color: #3f3f46; position: sticky; top: 0; }
          tr:hover { background-color: #fafafa; }
          textarea, input[type="text"] { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 6px; border: 1px solid #d4d4d8; border-radius: 4px; box-sizing: border-box; width: 100%; min-width: 100px; }
          textarea.query-box { width: 100%; height: 100px; font-family: monospace; padding: 10px; margin-bottom: 10px; }
          .actions { display: flex; gap: 5px; }
          button { background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
          button:hover { background: #059669; }
          button.danger { background: #ef4444; }
          button.danger:hover { background: #dc2626; }
          button.secondary { background: #3f3f46; }
          button.secondary:hover { background: #27272a; }
          .error { color: #ef4444; background: #fef2f2; padding: 10px; border-radius: 4px; border-left: 4px solid #ef4444; margin: 15px 0; }
          .success { color: #10b981; background: #ecfdf5; padding: 10px; border-radius: 4px; border-left: 4px solid #10b981; margin: 15px 0; }
          .nav-links a { color: #10b981; text-decoration: none; font-weight: 500; margin-right: 15px; padding: 5px 10px; border-radius: 4px; display: inline-block; }
          .nav-links a:hover { background: #ecfdf5; }
          .nav-links a.active { background: #10b981; color: white; }
          .header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4e4e7; padding-bottom: 15px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-flex">
            <h2 style="margin:0;">MySQL Editor PRO</h2>
          </div>
          
          <div class="nav-links" style="margin-bottom: 20px;">
            ${tables.map(t => `<a href="?table=${t.name}" class="${req.query.table === t.name ? 'active' : ''}">${t.name}</a>`).join('')}
          </div>
          
          <form method="POST" action="/query" style="background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
            <h4 style="margin-top:0;">Run Custom SQL Query</h4>
            <textarea name="query" class="query-box" placeholder="SELECT * FROM users;"></textarea>
            <button type="submit" class="secondary">Run Query</button>
          </form>
  `;

    if (req.query.success) html += `<div class="success">${req.query.success}</div>`;
    if (req.query.error) html += `<div class="error">${req.query.error}</div>`;

    const tableName = req.query.table;
    if (tableName && typeof tableName === 'string') {
        try {
            if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error("Invalid table name");

            // SHOW COLUMNS FROM tableName is safe because we regex checked tableName
            const [tableInfo] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
            const primaryKeyColObj = tableInfo.find(c => c.Key === 'PRI');
            const primaryKeyCol = primaryKeyColObj ? primaryKeyColObj.Field : null;

            // ORDER BY required PK or fallback to general limit without order if no PK
            let orderClause = primaryKeyCol ? `ORDER BY ${primaryKeyCol} DESC` : '';
            const [rows] = await db.query(`SELECT * FROM ${tableName} ${orderClause} LIMIT 100`);

            html += `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin:0;">Table: ${tableName} <span style="color:#71717a; font-size:14px; font-weight:normal;">(Top 100 rows)</span></h3>
        </div>
      `;

            if (!primaryKeyCol) {
                html += `<div class="error">Warning: No Primary Key found. Updating/Deleting rows via UI requires a Primary Key (like 'id').</div>`;
            }

            if (rows.length > 0) {
                const cols = Object.keys(rows[0]);
                html += `
          <div style="overflow-x: auto;">
          <table>
            <tr>
              ${cols.map(c => `<th>${c}</th>`).join('')}
              <th style="width: 140px;">Actions</th>
            </tr>
            ${rows.map(row => `
              <tr>
                <form method="POST" action="/update">
                  <input type="hidden" name="table" value="${tableName}">
                  <input type="hidden" name="pkCol" value="${primaryKeyCol || ''}">
                  <input type="hidden" name="pkVal" value="${primaryKeyCol ? row[primaryKeyCol] : ''}">
                  
                  ${cols.map(c => `
                    <td>
                      ${c === primaryKeyCol
                        ? `<strong>${row[c]}</strong><input type="hidden" name="col_${c}" value="${row[c]}">`
                        : `<textarea name="col_${c}" rows="1" style="min-height:30px resize:vertical;">${row[c] !== null && row[c] !== undefined ? row[c] : ''}</textarea>`
                    }
                    </td>
                  `).join('')}
                  
                  <td class="actions">
                    ${primaryKeyCol ? `
                      <button type="submit">Save</button>
                      <button type="submit" formaction="/delete" class="danger" onclick="return confirm('Delete this row?');">Delete</button>
                    ` : `<em>Read-only</em>`}
                  </td>
                </form>
              </tr>
            `).join('')}
          </table>
          </div>
        `;
            } else {
                html += `<p>Table is empty.</p>`;
            }
        } catch (e) {
            html += `<div class="error">Error: ${e.message}</div>`;
        }
    } else if (tableName) {
        html += `<div class="error">Invalid table parameter.</div>`;
    } else {
        html += `<div style="text-align:center; padding: 40px; color:#71717a;">Select a table above to view and edit data.</div>`;
    }

    html += `
        </div>
      </body>
    </html>
  `;

    res.send(html);
});

app.post('/update', async (req, res) => {
    const { table, pkCol, pkVal, ...cols } = req.body;
    if (!table || !pkCol || !pkVal) return res.redirect(`/?error=Missing primary key to update`);

    try {
        if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid table name");
        if (!/^[a-zA-Z0-9_]+$/.test(pkCol)) throw new Error("Invalid primary key column");

        let updates = [];
        let values = [];

        for (const [key, val] of Object.entries(cols)) {
            if (key.startsWith('col_') && key.substring(4) !== pkCol) {
                const colName = key.substring(4);
                if (!/^[a-zA-Z0-9_]+$/.test(colName)) throw new Error("Invalid column name");
                updates.push(`${colName} = ?`);
                values.push(val === '' ? null : val);
            }
        }

        if (updates.length > 0) {
            values.push(pkVal);
            await db.execute(`UPDATE ${table} SET ${updates.join(', ')} WHERE ${pkCol} = ?`, values);
        }

        res.redirect(`/?table=${table}&success=Row updated successfully`);
    } catch (e) {
        res.redirect(`/?table=${table}&error=${encodeURIComponent(e.message)}`);
    }
});

app.post('/delete', async (req, res) => {
    const { table, pkCol, pkVal } = req.body;
    if (!table || !pkCol || !pkVal) return res.redirect(`/?error=Missing primary key to delete`);

    try {
        if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid table name");
        if (!/^[a-zA-Z0-9_]+$/.test(pkCol)) throw new Error("Invalid primary key column");

        await db.execute(`DELETE FROM ${table} WHERE ${pkCol} = ?`, [pkVal]);
        res.redirect(`/?table=${table}&success=Row deleted successfully`);
    } catch (e) {
        res.redirect(`/?table=${table}&error=${encodeURIComponent(e.message)}`);
    }
});

app.post('/query', async (req, res) => {
    const query = req.body.query;
    if (!query) return res.redirect('/?error=No query provided');

    let resultHtml = `
    <html>
      <head>
        <title>Query Result</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; background: #f4f4f5; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #e4e4e7; padding: 8px; text-align: left; }
          th { background: #f4f4f5; }
          a.back { display: inline-block; margin-bottom: 20px; color: #10b981; text-decoration: none; font-weight: bold; }
          .error { color: #ef4444; background: #fef2f2; padding: 10px; border-radius: 4px; border-left: 4px solid #ef4444; }
          .success { color: #10b981; background: #ecfdf5; padding: 10px; border-radius: 4px; border-left: 4px solid #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back">← Back to Editor</a>
          <h3>Query:</h3>
          <pre style="background: #f4f4f5; padding: 10px; border-radius: 4px;">${query}</pre>
          <h3>Result:</h3>
  `;

    try {
        const isSelect = query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('SHOW');
        if (isSelect) {
            const [rows] = await db.query(query);
            if (Array.isArray(rows) && rows.length > 0) {
                const cols = Object.keys(rows[0]);
                resultHtml += `
          <div style="overflow-x:auto;">
          <table>
            <tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>
            ${rows.map(row => `
              <tr>${cols.map(c => `<td>${row[c] !== null && row[c] !== undefined ? String(row[c]).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>NULL</em>'}</td>`).join('')}</tr>
            `).join('')}
          </table>
          </div>
          <p class="success" style="margin-top:20px;">${rows.length} rows returned.</p>
        `;
            } else {
                resultHtml += `<p>0 rows returned.</p>`;
            }
        } else {
            const [info] = await db.query(query);
            const affected = (info && info.affectedRows !== undefined) ? info.affectedRows : 0;
            resultHtml += `<div class="success">Query executed successfully. Rows affected: ${affected}</div>`;
        }
    } catch (e) {
        resultHtml += `<div class="error">Error: ${e.message}</div>`;
    }

    resultHtml += `
        </div>
      </body>
    </html>
  `;

    res.send(resultHtml);
});

app.listen(port, () => {
    console.log(`===============================================`);
    console.log(`  🔥 MYSQL DB EDITOR PRO is running 🔥 `);
    console.log(`  URL: http://localhost:${port}  `);
    console.log(`===============================================`);
});
