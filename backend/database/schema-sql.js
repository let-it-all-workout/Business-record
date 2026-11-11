/** Turn a schema file into statements. Full-line comments must not hide the SQL that follows them. */
export function statementsFromSchema(schema) {
  const withoutComments = String(schema)
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
