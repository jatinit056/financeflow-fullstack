/**
 * Table view of a chart's data — the accessible twin of every chart, and handy for
 * reading exact values.
 */
export function DataTable({ caption, columns, rows, visuallyHidden = false }) {
  const table = (
    <table className={visuallyHidden ? 'sr-only' : 'w-full text-left text-sm'}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-rule text-[13px] text-ink-3">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`py-2 pr-4 font-medium last:pr-0 ${column.align === 'right' ? 'text-right' : ''}`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((row, index) => (
          <tr key={row.key ?? index}>
            {columns.map((column, columnIndex) => {
              const content = column.render ? column.render(row) : row[column.key];
              const align = column.align === 'right' ? 'text-right tabular-nums' : '';
              return columnIndex === 0 ? (
                <th
                  key={column.key}
                  scope="row"
                  className={`py-2.5 pr-4 font-medium text-ink ${align}`}
                >
                  {content}
                </th>
              ) : (
                <td key={column.key} className={`py-2.5 pr-4 text-ink-2 last:pr-0 ${align}`}>
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (visuallyHidden) return table;

  // Scrollable regions must be reachable by keyboard so the table can be scrolled.
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${caption} (table)`}>
      {table}
    </div>
  );
}
