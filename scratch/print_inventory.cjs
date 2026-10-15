const fks = require('./unindexed_fks.json');

console.log(`Total Unindexed Foreign Keys: ${fks.length}\n`);
fks.forEach((r, idx) => {
  const col = r.fk_columns.replace(/[{}]/g, '');
  console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${r.table_name}.${col} -> ${r.foreign_table_name} [ON DELETE ${r.delete_rule}] (constraint: ${r.constraint_name})`);
});
